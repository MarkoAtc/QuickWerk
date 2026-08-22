# Issue Draft — Checkout screen (payment sequence slice 4 of 4)

## Title
Payment sequence slice 4: customer-facing checkout screen (final slice)

## Problem
Slices 1–3 (real pricing table, simulated payment-method storage, pre-job checkout endpoint) are merged. The backend can quote and charge a booking before the job happens, but nothing in the app calls those endpoints yet. Two loose ends from the design docs remain: `design/payment_checkout`'s mockup screen has no frontend implementation, and the booking-wizard's `PaymentSection` (added pre-slice-1) is decorative — its selected value is never sent anywhere.

## Key architectural finding: `PaymentSection` lives at the wrong lifecycle stage
`PaymentSection` renders during booking creation, before a provider is assigned. But `checkoutBooking` requires `booking.status === 'accepted'` (it needs `providerUserId` to capture payment) — so real checkout is structurally impossible at wizard time. This isn't a wiring gap, it's a lifecycle mismatch: the mockup's checkout screen is a distinct step that happens later, after provider acceptance, not a section of the booking-wizard form. The wizard already has a `SummaryCard` note stating "nothing is charged when you submit this request" — that framing was already correct. Per prior guidance to build capability rather than silently drop a designed affordance: `PaymentSection` is replaced with a small static note ("You'll choose how to pay once your provider accepts"), not deleted — the payment-method *choice* still exists, it just moves to the new checkout screen at the correct lifecycle point. The real entry point is a new "Pay now" CTA on the existing `active-job` screen, shown only when `status === 'accepted'` and no payment has been captured yet.

## Goal
Add a real checkout screen (`/checkout?bookingId=...`) that: loads the booking's active quote (requesting one if none exists) and the customer's saved payment methods, lets the customer pick a method (or add one with a single tap — no card-number entry, since `last4` is server-generated per slice 2's design), and submits checkout. On success, hands off to `/active-job`, which already renders the resulting payment via its existing `paymentSummary`. No backend changes — all four endpoints this screen needs (quote, checkout, list/add payment methods) are already merged.

## Design decisions (mockup deviations, made explicit)
- **No Apple Pay.** The mockup makes it the visually primary option, but `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §2 scopes payment as simulated-only by decision, not oversight — there is no payment processor to integrate with. Omitted entirely (not rendered disabled), and called out in the PR description so the omission is visible, not silent.
- **Card row string is "Visa ending in 4242"** (exact mockup wording), not a masked-dots format.
- **No countdown ticker.** The mockup has no expiry UI at all to match. Show a single static "Valid until {local time}" caption computed once from the quote's `expiresAt` at load time (no `setInterval`). `checkoutBooking` returns 409 for two different reasons (expired/mismatched quote, *or* the booking's status no longer being `accepted` — e.g. the provider completed it mid-checkout) and the status code alone doesn't distinguish them; string-matching the server's error message is brittle. So on any checkout 409, the recovery action is to re-run the *full* `loadCheckoutData` (not just re-request a quote): if the booking is still `accepted`, that yields a fresh quote and the form re-enables; if it isn't, the same status-branching the initial load already does hands off to `/active-job`. One code path handles both cases correctly, and "expired" doesn't need to be an accurate label — it just means "reload and see."
- **Add-card is a single tap**, not a form: `{ label: 'Visa', brand: 'visa' }` (fixed, not the server's generic defaults) so the row it produces actually reads "Visa ending in ####" per the mockup, not "Payment method ending in ####".
- **Already-paid handoff.** A booking can be `accepted` and already have a captured payment (checkout already happened once, or the provider hasn't completed yet). The screen fetches the existing payment (`GET :bookingId/payment`) alongside the quote; if one exists, it hands off to `/active-job` instead of rendering a fresh "Pay Securely $X" for something already paid.

## Bug found and fixed in passing: missing `content-type` header on two existing builders
While writing the first real fetch call against `createAddPaymentMethodRequest`/`createCheckoutBookingRequest` (both merged in slice 2/3), discovered neither builder's `headers` included `content-type: application/json` — unlike `createSubmitReviewRequest`/`createSubmitDisputeRequest`, which do. Confirmed against the real backend: a POST with a JSON string body but no `content-type` header hits Express's default body-parser, which never parses it, so `req.body` arrives empty/malformed (reproduced: `{"label":"Visa","brand":"visa"}` sent without the header came back `400 Unexpected field "{...}" is not accepted`). Every previous curl-based verification of these two endpoints (slices 2 and 3) always passed `-H 'Content-Type: application/json'` explicitly, masking this. Fixed both builders in `packages/api-client/src/index.ts` to match the working pattern — root-caused in the shared builder, not patched around at this slice's call site, so any future caller gets it right automatically.

## Acceptance Criteria
- [x] New route `apps/product-app/app/checkout.js` reads `bookingId` from route params (same `resolveBookingIdParam`-style helper as `active-job`/`booking-completion`), redirects to `/auth` if unauthenticated.
- [x] Load sequence: fetch booking first. `status === 'completed'` → handoff to `/booking-completion`. `status !== 'accepted'` (submitted/declined) → handoff to `/active-job`. Otherwise **await the payment check before requesting a quote** (`requestBookingQuote` is a POST that creates a quote when none exists — running it in parallel with the payment check would write a spurious quote for an already-paid booking); an existing payment → handoff to `/active-job` without ever requesting a quote. Only if no payment exists: request the quote (payment-methods list can run in parallel with this). A 409 from the quote request (booking transitioned mid-load) → handoff to `/active-job`.
- [x] Screen renders: service summary line (`requestedService`), itemized total from the quote's `lineItems`/`calloutFeeCents`/`laborCents`/`platformFeeCents`/`totalCents` (matches `pricing-table.ts`'s known values exactly — no independent computation on the client), a radio list of saved payment methods ("Visa ending in {last4}"), a one-tap "Add new card" row, and a "Pay Securely {total}" button (disabled until a method is selected).
- [x] Submitting calls `checkoutBooking` via `createCheckoutBookingRequest(sessionToken, bookingId, { quoteId, paymentMethodId })`; success hands off to `/active-job?bookingId=...`. Any 409 surfaces a "Get updated total" recovery state whose tap re-runs the full `loadCheckoutData` (not a second, separate quote-only re-fetch) — this correctly handles both "quote expired" (re-enables the form with a fresh quote) and "booking no longer accepted" (hands off to `/active-job`) through the same reload path. A 403 (payment method rejected) surfaces as an inline error message, not a crash.
- [x] `active-job-presenter.ts` gains a `showPayNowCta: boolean` field (`viewerRole === 'customer' && booking.status === 'accepted' && !payment`); `active-job-screen.js` renders a "Pay now" button (using it) directly below the existing Payment card, wired to `router.push({ pathname: '/checkout', params: { bookingId } })` in `app/active-job.js`.
- [x] `booking-wizard-screen.js`'s `PaymentSection` replaced with a static informational note (no interactive rows, no local `paymentMethod` state — nothing consumed it). `SummaryCard`'s existing "nothing is charged when you submit" copy is left as-is (already correct).
- [x] Tests: `checkout-screen-actions.ts` unit tests (fetch-injected, same pattern as `payout-screen-actions.test.ts`/`active-job-screen-actions.test.ts`) covering: booking-not-accepted → handoff, already-paid accepted booking → handoff, quote+methods load success, add-card success, checkout success, checkout 409 (expired) → recovery state (not a crash/generic error), checkout 403 → inline error. `active-job-presenter.test.ts` gains cases for `showPayNowCta` across viewer role / status / payment-presence combinations.
- [x] `pnpm --filter @quickwerk/product-app test`, `pnpm -r typecheck` pass.
- [x] Real-verification: loaded the actual screen. Started an isolated backend on a scratch port plus `expo start --web` on another scratch port, drove real phone/OTP sign-in, category selection, booking-wizard submission, provider acceptance (via the real API), and the resulting `active-job` → "Pay now" → `/checkout` navigation entirely through headless-Chrome DOM interaction (CDP, no test library) — not curl, not a mock. Confirmed on-screen: itemized total (`EUR 45.00` / `170.00` / `12.50` → `227.50`, exactly `pricing-table.test.ts`'s known plumbing/scheduled value), the empty-state "Add new card" row, adding a card producing "Visa ending in 4105" (fixed label/brand, matching the mockup's wording), submitting checkout, and landing back on `/active-job` showing "Payment captured: EUR 227.50" with the "Pay now" button correctly gone. Screenshots captured at each step.

## Not in scope (explicitly deferred)
- Any real payment processor integration (Apple Pay, Stripe) — simulated only, per docs/planning/14 §2, a standing decision not reopened here.
- A "manage payment methods" settings screen — the mockup's own affordance is inline in checkout, and building a separate screen would be unrequested scope.
- Any change to backend endpoints — all four this screen needs are already merged from slices 1–3.
- A ticking countdown timer for quote expiry — see Design decisions above.

## Labels (suggested)
- enhancement
- frontend
- payments

## Priority
P1 (final slice of the payment sequence)

---

# Plan

## Risk/TDD classification
`standard` for the screen/actions layer (parse-and-branch logic, same shape as `active-job-screen-actions.ts` — no new algorithmic risk). `risky-logic` only for the `showPayNowCta` gating condition (customer + accepted + no payment) since a wrong gate would either hide a real "pay now" affordance or show a stale one for an already-paid booking — this gets explicit RED-first test cases in `active-job-presenter.test.ts` before the field is wired into the screen.

## Validation Contract
### Assertions (written before implementation)
- [x] `showPayNowCta` is `true` only for `viewerRole === 'customer' && status === 'accepted' && payment` absent; `false` for provider viewer, for any other status, and for an accepted booking that already has a payment.
- [x] `loadCheckoutData` returns a `handoff` result (not an error, not a loaded screen) for: booking `completed`, booking `submitted`/`declined`, and an `accepted` booking that already has a captured payment.
- [x] `loadCheckoutData`'s quote total matches `pricing-table.test.ts`'s known values for the same category/urgency (e.g. plumbing/scheduled → 22750) — proving the client renders the server's number, not a re-derived one.
- [x] `addPaymentMethodForCheckout` sends `{ label: 'Visa', brand: 'visa' }` and the resulting record's `label`/`brand` reflect that (not the server's generic defaults).
- [x] `submitCheckout` on any 409 response returns a distinct "needs-reload" result variant (not the generic error variant), and the screen's handler for it calls `loadCheckoutData` again rather than a quote-only re-fetch — verified against both underlying causes (expired quote → re-enabled form with a fresh quote; booking no longer `accepted` → handoff to `/active-job`) resolving correctly through that one path.
- [x] `submitCheckout` on success returns the `PaymentRecord` fields the screen needs to hand off (`paymentId` at minimum) — screen itself just routes to `/active-job`, doesn't re-render the payment.
- [x] Type-check passes with zero errors (`pnpm -r typecheck`).
- [x] `checkout-screen-actions.test.ts` and updated `active-job-presenter.test.ts` pass with zero failures.

### Performance bounds
- N/A — client-side fetch/parse only, same cost profile as the existing `active-job` load sequence it mirrors.

### Interface contracts
- No new backend endpoints or `packages/api-client` builders — this slice consumes `createGetBookingRequest`, `createGetBookingPaymentRequest`, `createListMyPaymentMethodsRequest`, `createAddPaymentMethodRequest`, `createRequestBookingQuoteRequest`, `createCheckoutBookingRequest`, all already merged.
- `checkout-screen-actions.ts`'s exported result types are consumed only by `app/checkout.js` and its own test file — no cross-package contract.

## Branch
`feature/payment-checkout-screen-slice4`

## Plan file path
`.agent/plans/issue-draft-checkout-screen.md` (this file)

## Frontend
- `apps/product-app/src/features/booking/checkout-screen-actions.ts` (new): mirrors `active-job-screen-actions.ts`'s shape.
  - `parseQuote(payload)` — hand-rolled parse/validate (no shared `QuoteRecord` export exists in `@quickwerk/domain`), following `booking-completion-screen-actions.ts`'s `lineItems` validation pattern exactly (reject the whole quote if any line item is malformed).
  - `parsePaymentMethod(payload)` / `parsePaymentMethodList(payload)`.
  - `loadCheckoutData({ sessionToken, bookingId }, fetchImpl?)`: fetch booking → branch on status (handoff variants for completed/not-accepted) → **await** the payment fetch (payment-methods list can run in parallel with it) → handoff if a payment already exists → only then request the quote (payment-methods, if not already in flight, alongside it) → handoff if the quote request 409s → otherwise `{ status: 'loaded', booking, quote, paymentMethods }`. Reused verbatim by the checkout-screen's post-409 recovery action (see `submitCheckout` below) — one function, two call sites.
  - `addPaymentMethodForCheckout(sessionToken, fetchImpl?)`: `createAddPaymentMethodRequest(sessionToken, { label: 'Visa', brand: 'visa' })`, returns the new `PaymentMethodRecord` or an error.
  - `submitCheckout({ sessionToken, bookingId, quoteId, paymentMethodId }, fetchImpl?)`: `createCheckoutBookingRequest`, returns `{ status: 'success', payment }` / `{ status: 'needs-reload' }` (any 409 — screen's handler re-runs `loadCheckoutData`, not a quote-only re-fetch) / `{ status: 'error', message }` (everything else, including 403).
  - Reuses `resolveBookingIdParam` exported from `active-job-route-state.ts` — no second copy.
- `apps/product-app/src/features/booking/checkout-screen.js` (new): presentational, mirrors `active-job-screen.js`'s prop-driven shape (`model`, callbacks) — no internal data fetching. Owns only local UI state: `selectedPaymentMethodId` (defaults to the first/newest method if any), `isAddingCard`, `isSubmitting`. Sections: service summary, itemized order-summary card (mirrors mockup layout/order but with real field names), payment-method radio list + "Add new card" row, "Valid until {time}" caption, "Pay Securely {total}" button, expired-quote recovery state.
- `apps/product-app/app/checkout.js` (new): route file, same shape as `app/active-job.js` — `useLocalSearchParams`, `useSession`, auth redirect, `loadCheckoutData` call, handoff routing, renders `<CheckoutScreen />` with callbacks (`onAddCard`, `onSubmit`, `onRetryExpiredQuote`) that call the actions and update local state.
- `apps/product-app/src/features/booking/active-job-presenter.ts`: add `showPayNowCta` to `ActiveJobViewModel` and `presentActiveJob`.
- `apps/product-app/src/features/booking/active-job-screen.js`: render a "Pay now" button (using `componentStyles.button.primary`, matching the mockup's CTA color) below the Payment card when `model.showPayNowCta`; new `onPayNow` prop.
- `apps/product-app/app/active-job.js`: wire `onPayNow={() => router.push({ pathname: '/checkout', params: { bookingId } })}`.
- `apps/product-app/src/features/booking/booking-wizard-screen.js`: replace `PaymentSection`'s interactive `PaymentRow`s with a static note box (same visual language as `SummaryCard`); remove the now-unused `paymentMethod` state and `onSelectPaymentMethod` plumbing from `BookingWizard`.

## Edge cases / failure handling
- Zero payment methods on load: "Add new card" row renders, Pay button stays disabled until one is added (no crash, no forced modal).
- Quote expires between load and tap: `submitCheckout` 409s → "needs-reload" recovery state → one tap re-runs the full `loadCheckoutData` → fresh quote, form re-enables with the new (in practice identical, since price is deterministic from category/urgency) total.
- Network/parse failures on the initial load: generic error state with a retry button, matching `active-job`'s `active-job-error`/`active-job-retry` convention.
- Booking transitions away from `accepted` while the screen is open (provider completes it mid-checkout, e.g. via `completeBooking` racing this screen): `checkoutBooking` 409s the same way an expired quote would. The recovery tap's full `loadCheckoutData` re-run resolves this correctly too — it re-fetches the booking, sees the new status, and hands off to `/active-job` — without needing to tell the two 409 causes apart.

## Rollback considerations
- Additive except for two edits to already-shipped files: `active-job-presenter.ts`/`active-job-screen.js` gain a new field/button (safe to revert — no existing behavior changes for `showPayNowCta: false`), and `booking-wizard-screen.js`'s `PaymentSection` swap (safe to revert — the removed state was never consumed downstream). No backend changes at all.

## Verification
```bash
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```
Plus the real-backend curl flow already used to verify slice 3 (confirms the exact request/response shapes this screen's parse functions consume), since no RN screen-render test harness exists in this repo to visually verify against.
