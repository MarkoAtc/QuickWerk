# Issue Draft — Pre-job checkout endpoint (payment sequence slice 3 of 4)

## Title
Payment sequence slice 3: pre-job checkout endpoint (immutable quote + single payment write path)

## Problem
Slice 1 (real pricing table) and slice 2 (simulated payment-method storage) are merged. Payment is still only ever captured **after** job completion (`BookingsService.completeBooking` → `PaymentsService.capturePaymentForBooking`). The `design/payment_checkout` mockup shows a **pre-job** checkout: the customer sees an itemized total and picks a saved payment method (or Apple Pay) before the job happens, taps "Pay Securely $227.50". Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §4: the server must create an immutable quote (line items, amount, pricing-table version, expiry) from booking data; checkout accepts only the quote id, never a client-supplied total; and the checkout write path must reconcile with the existing post-completion capture path so there is **one** payment write path, not two.

## Goal
Add two booking-scoped endpoints — request a quote, then check out against it — reusing the *already-idempotent* `capturePaymentForBooking` as the single payment write path, with **zero changes** to the existing `completeBooking` method. No new write path is introduced; the existing one is simply reachable from an earlier point in the booking lifecycle too.

## Key architectural finding (why this is a small diff)
`capturePaymentForBooking`, `PayoutsService.createPayoutForCapture`, and `InvoicesService.generateInvoiceForBooking` are **already each independently idempotent by `bookingId`** (confirmed by reading all three in-memory repositories — each does a `find`/`get` by `bookingId` before writing and returns the existing record, `replayed: true`, on a repeat call). This means checkout can call the *exact same* `capturePaymentForBooking` method that `completeBooking` already calls, and whichever of the two fires first "wins" — the second call is a no-op replay at every layer (payment, payout, invoice), not a duplicate. `completeBooking` does not need to change at all: it will simply hit the already-existing payment record (via the existing `replayed: true` path) if checkout ran first.

## Accepted product consequence: payout/invoice timing shift
Any booking that goes through checkout now gets a `PayoutRecord` (status `pending`) and an `InvoiceRecord` created **at checkout time** (booking still `accepted`, job not yet done) instead of at completion. Checked `apps/product-app/src/features/payouts/payout-screen.js` (the only provider-facing payout UI) for a completion assumption: the status badge already renders the real payout status (`pending`/`processing`/`settled`/`failed`) generically, so a provider will correctly see "pending" for a not-yet-completed job, not a false "paid" signal. The only stale bit is the empty-state copy ("Completed, paid bookings will show up here"), which becomes slightly imprecise once a payout can exist pre-completion — cosmetic, not a correctness bug, not fixed in this slice. No invoice-facing screen exists outside `booking-completion-screen.js`, which this slice does not touch. Conclusion: benign, no scope change needed.

## Acceptance Criteria
- [x] `POST /api/v1/bookings/:bookingId/quote` (party-based, not customer-only — must be a party to the booking via the existing `isBookingParty` check, same as every sibling booking-scoped endpoint, booking must be `status === 'accepted'` — 409 otherwise): idempotently returns an existing non-expired quote for this booking if one exists, otherwise creates and returns a new one. Response: `{ quoteId, bookingId, lineItems, calloutFeeCents, laborCents, platformFeeCents, totalCents, currency: 'EUR', pricingTableVersion, createdAt, expiresAt }`. Computed via `computeBookingPrice(booking.serviceCategory, booking.urgency)` from slice 1 — the client supplies nothing pricing-related.
- [x] `POST /api/v1/bookings/:bookingId/checkout` (same party/status gate): body `{ quoteId: string, paymentMethodId: string }` — **no amount, no line items accepted from the client, ever**. Validates: `quoteId` exists, belongs to this `bookingId`, and has not expired (409 if expired — customer must request a new quote); `paymentMethodId` exists and belongs to the calling customer (403 otherwise, via a new `PaymentMethodsService.getPaymentMethodOwnedByCustomer` lookup). On success, calls `capturePaymentForBooking` using the **quote's frozen `totalCents`** (not a fresh `computeBookingPrice` call — the quote is what makes it immutable) and returns the resulting `PaymentRecord`.
- [x] Quotes expire 15 minutes after creation (`QUOTE_EXPIRY_MINUTES = 15`, named constant). A new quote request after expiry creates a fresh quote (does not resurrect the expired one).
- [x] New in-memory-only repository (mirrors `payment-methods`' shape, not `payouts`/`invoices` — no Postgres implementation needed this slice): `bookings/domain/quote.repository.ts` (`QuoteRecord`, `CreateQuoteInput`, `QUOTE_REPOSITORY` symbol, `createQuote`, `getQuoteById`, `getActiveQuoteForBooking`), `bookings/infrastructure/in-memory-quote.repository.ts`. Lives inside `bookings/` (not a new top-level module) because quote/checkout are booking-scoped actions exactly like the existing `getBookingTracking`/`getBookingProviderIdentity`/`getBookingContact` methods already on `BookingsService` — not a new cross-cutting domain like `payments`/`payouts`.
- [x] `PaymentMethodsService` gains `getPaymentMethodOwnedByCustomer(customerUserId, paymentMethodId)` (small, natural extension of slice 2's own module — not new scope). `BookingsModule` imports `PaymentMethodsModule` (same pattern as its existing `PaymentsModule`/`ProvidersModule` imports).
- [x] `bookings.controller.ts` gains `POST :bookingId/quote` and `POST :bookingId/checkout`, identical auth boilerplate to every sibling route.
- [x] `packages/api-client`: `createRequestBookingQuoteRequest`, `createCheckoutBookingRequest`, same flat-file pattern as existing builders.
- [x] Tests: quote creation (deterministic total matching `pricing-table.test.ts`'s known values, idempotent re-request returns same quote while valid, new quote after expiry), checkout (happy path captures payment with the quote's frozen total; rejects expired quote 409; rejects a payment method not owned by the caller 403; rejects a quote for a different booking); **the replay/reconciliation proof, both orderings** — (a) checkout then `completeBooking` for the same booking, and (b) `completeBooking` then checkout for the same booking (the ordering all real traffic takes today, since slice 4/the checkout screen doesn't exist yet) — assert exactly one `PaymentRecord`/`PayoutRecord`/`InvoiceRecord` exists for that `bookingId` in both cases, and that ordering (b) has checkout rejected 409 (booking no longer `accepted`) rather than reaching `capturePaymentForBooking` a second time.
- [x] `pnpm --filter @quickwerk/platform-api test`, `pnpm -r typecheck` pass.
- [x] Real-backend verification: create → accept a booking, request a quote, check out against it (confirm payment captured with the quote's exact total), then complete the booking and confirm the completion response shows the *same* `paymentId` (not a second payment).

## Not in scope (explicitly deferred)
- The `/checkout` screen itself (slice 4) and wiring the booking-wizard's decorative `PaymentSection` to any of this.
- Any change to `completeBooking` — deliberately zero-diff, per the architectural finding above.
- A Postgres-backed quote repository — in-memory only, matching `payment-methods`, not `payouts`/`invoices` (quotes are short-lived by design; nothing here needs cross-restart durability).
- Cancelling/voiding a quote early, or letting a customer have more than one *active* (non-expired) quote per booking simultaneously — the idempotent "return the existing active quote" behavior makes an explicit cancel unnecessary for this slice.

## Labels (suggested)
- enhancement
- backend
- payments

## Priority
P1 (blocks slice 4: the checkout screen needs this endpoint to call)

---

# Plan

## Risk/TDD classification
`risky-logic` — this is the crux of the whole payment sequence's reconciliation requirement. The RED proof: a test that calls checkout then `completeBooking` for the same booking and asserts exactly one payment/payout/invoice record exists for that `bookingId`, written and run against the current (slice-2-only) codebase first — it should fail to even compile (no checkout method exists yet), confirming the test targets code that doesn't exist, before the endpoint is built.

## Validation Contract
### Assertions (written before implementation)
- [x] Quote total for a known category/urgency combination exactly matches `computeBookingPrice`'s value (cross-checked against `pricing-table.test.ts`'s existing known values, e.g. plumbing/scheduled → 22750).
- [x] Requesting a quote twice in a row (both within the expiry window) returns the same `quoteId` and total — not two separate quotes.
- [x] Checking out with an expired `quoteId` is rejected (409) and does not call `capturePaymentForBooking`.
- [x] Checking out with a `paymentMethodId` belonging to a different customer is rejected (403) and does not call `capturePaymentForBooking`.
- [x] Checkout followed by `completeBooking` for the same booking results in exactly one `PaymentRecord`, one `PayoutRecord`, and one `InvoiceRecord` for that `bookingId` — this is the load-bearing assertion for the whole slice.
- [x] `completeBooking` followed by checkout for the same booking (today's only real ordering, since no UI calls checkout yet): checkout is rejected 409 (booking status is `completed`, not `accepted`) and does not create a second `PaymentRecord`/`PayoutRecord`/`InvoiceRecord`.
- [x] Non-party / wrong-role / wrong-status (not `accepted`) requests to either endpoint are rejected, matching the existing sibling-endpoint gating pattern exactly.
- [x] Type-check passes with zero errors (`pnpm -r typecheck`).
- [x] `pnpm --filter @quickwerk/platform-api test` passes with zero failures.

### Performance bounds
- N/A — in-memory operations only, no external calls, no latency-sensitive path introduced.

### Interface contracts
- `POST /api/v1/bookings/:bookingId/quote` → `{ quoteId, bookingId, lineItems, calloutFeeCents, laborCents, platformFeeCents, totalCents, currency, pricingTableVersion, createdAt, expiresAt }`, or 403/404/409 per the party/status gates.
- `POST /api/v1/bookings/:bookingId/checkout` accepts `{ quoteId: string, paymentMethodId: string }` and returns the `PaymentRecord` on success (matching `capturePaymentForBooking`'s existing return shape — no new payment shape introduced), or 400/403/404/409 for the failure cases above.

## Branch
`feature/payment-checkout-endpoint-slice3`

## Plan file path
`.agent/plans/issue-draft-checkout-endpoint.md` (this file)

## Backend
- `bookings/domain/quote.repository.ts` (new file): `QuoteRecord`, `CreateQuoteInput { bookingId, customerUserId, lineItems, calloutFeeCents, laborCents, platformFeeCents, totalCents, currency, pricingTableVersion, createdAt, expiresAt }`, `QuoteRepository` interface (`createQuote`, `getQuoteById`, `getActiveQuoteForBooking(bookingId, now)`), `QUOTE_REPOSITORY` symbol.
- `bookings/infrastructure/in-memory-quote.repository.ts` (new file): `Map<string, QuoteRecord>`; `getActiveQuoteForBooking` filters by `bookingId` and `expiresAt > now`.
- `bookings.service.ts`:
  - `requestBookingQuote(session, bookingId)`: load booking, `isBookingParty` check (403), `status !== 'accepted'` → 409, return existing active quote if present, else compute via `computeBookingPrice` and persist a new one.
  - `checkoutBooking(session, bookingId, { quoteId, paymentMethodId })`: same gates, then: load quote by id, verify `quote.bookingId === bookingId` and not expired (409), verify payment method ownership via `paymentMethodsService.getPaymentMethodOwnedByCustomer` (403 if not owned/not found), call `this.paymentsService.capturePaymentForBooking({ ..., amountCents: quote.totalCents, ... })` (frozen quote total, not a fresh `computeBookingPrice` call), return the payment.
  - Constructor gains `PaymentMethodsService` and the new `QUOTE_REPOSITORY` injection.
- `bookings.controller.ts`: `POST :bookingId/quote`, `POST :bookingId/checkout`, identical boilerplate to sibling routes.
- `payment-methods.service.ts` / `domain/payment-method.repository.ts`: add `getPaymentMethodOwnedByCustomer(customerUserId, paymentMethodId)` — small addition, repository gains a `findById`-style lookup filtered by owner.
- `bookings.module.ts`: import `PaymentMethodsModule`; register `InMemoryQuoteRepository` + a `quoteRepositoryProvider` (mirrors `payment-method-repository.provider.ts`'s `useClass` shape — in-memory only).
- Tests: `pricing`-adjacent quote tests in a new `bookings/quote.service.test.ts` (or extend `bookings.service.test.ts` — follow whichever the codebase's existing file-splitting convention favors, mirroring how `bookings.service.tracking.test.ts`/`bookings.service.contact.test.ts` are already split out per-feature) covering the Validation Contract assertions above, including the load-bearing checkout-then-complete single-write-path test.

## Frontend (`packages/api-client` only — no UI wiring this slice)
- `createRequestBookingQuoteRequest(sessionToken, bookingId)`, `createCheckoutBookingRequest(sessionToken, bookingId, { quoteId, paymentMethodId })`.
- No screen changes — see "Not in scope."

## Edge cases / failure handling
- Booking never reaches `accepted` (still `submitted`, or `declined`): both endpoints return 409, matching the existing transition-conflict convention.
- Provider or a non-party customer calls either endpoint: 403, matching `isBookingParty`.
- Quote requested, booking later declined somehow (not currently possible once accepted — no path back from `accepted` to `declined` exists in the state machine) — not a real case given the current 4-status lifecycle; no special handling needed.
- Checkout called a second time with the same already-used `quoteId`: succeeds and returns the same payment (idempotent, per the architectural finding) — not an error. This is deliberate: it's the same guarantee `completeBooking` already relies on.

## Rollback considerations
- Fully additive: two new endpoints, one new in-memory-only repository, one small addition to an existing service (slice 2's `PaymentMethodsService`). Zero changes to `completeBooking` or any existing payment/payout/invoice code. Safe to revert by removing the two new routes/methods.

## Verification
```bash
pnpm --filter @quickwerk/platform-api test
pnpm -r typecheck
```
Plus real-backend verification per the acceptance criteria above.
