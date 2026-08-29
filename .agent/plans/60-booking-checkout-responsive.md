# Issue #60 — Customer booking and checkout responsiveness

## Issue

[#60 — Audit and repair customer booking and checkout responsiveness](https://github.com/MarkoAtc/QuickWerk/issues/60)

Parent roadmap: [#55 — Complete mobile-first responsiveness and remaining UI migration](https://github.com/MarkoAtc/QuickWerk/issues/55)

## Goal

Audit and repair the bounded customer booking/payment route group at the established phone viewport matrix. Reuse the responsive baseline from #56 and preserve all booking submission, session, quote, simulated-payment, stale-quote, and navigation contracts while making `/booking-wizard`, `/booking`, and `/checkout` usable from 320px phones through wide web layouts.

## Execution contract

- **Branch:** `codex/fix/60-booking-checkout-responsive`
- **Plan:** `.agent/plans/60-booking-checkout-responsive.md`
- **Classification:** `risky-logic` — presentation changes surround authenticated booking creation and simulated checkout controls, so responsive rendering must not alter request bodies, state transitions, payment gating, or navigation.
- **RED proof:** add focused tests for a customer-booking layout policy before the policy exists. The failing import must establish phone/compact/wide decisions for gutters, card padding, urgency composition, summary rows, payment rows, and fixed-action/safe-area spacing.
- **GREEN proof:** the new policy tests, existing responsive/booking/checkout state and action suites, product suite, workspace typecheck, Expo export, full CI-equivalent checks, and browser state/viewport matrix all pass.

## Route-group inventory

| Route | Current behavior to preserve | Responsive concern to audit/repair |
|---|---|---|
| `/booking-wizard` | Category/address/provider context, issue + urgency submission, session expiry handling, address editing, navigation to `/active-job` | Fixed urgency-card row, wide header/content gutters, keyboard/safe-area pressure in the bottom editor, error/footer overlap, long address and helper copy |
| `/booking` | Auth redirect/sign-out, free-text booking request, inline error, submitted confirmation, navigation to `/active-job` | Verify shared-shell behavior at every width; repair only demonstrated form, confirmation, or long-content issues |
| `/checkout` | Missing/loading/error states, booking-status handoffs, server quote, simulated payment methods, add card, stale-quote reload, payment submission, navigation | Long line-item/amount rows, total row, payment labels, empty/multiple methods, warning/error blocks, pay CTA reachability |

### Explicitly deferred route groups

- Active/post-job: `/active-job`, `/booking-completion`, `/review`.
- Provider experience: `/provider`, `/provider-onboarding`, `/provider-profile`, `/payouts`.
- Secondary/public surfaces: `/marketplace-preview`, `/messenger`, `/sign-in`.
- Admin web remains a separate desktop design-parity phase.

## Acceptance criteria

- [ ] All three routes are delivered as one bounded customer booking/payment group and reuse the existing `resolveResponsiveLayout` / `useResponsiveLayout` contract; no parallel breakpoint system or new dependency is introduced.
- [ ] `/booking-wizard` keeps its header, location, multiline description, urgency choices, payment note, summary, and confirmation action readable and reachable at supported phone widths.
- [ ] The booking-wizard address editor remains usable under safe-area and virtual-keyboard pressure; long locations do not hide Cancel/Save or create page-level horizontal overflow.
- [ ] Booking-wizard validation, submission loading/error behavior, `category` / `address` / `providerUserId` context, authenticated request body, and navigation to `/active-job` remain unchanged.
- [ ] `/booking` remains usable in blank, submitting, error, and submitted-confirmation states; auth redirect, sign-out, request submission, and navigation to `/active-job` remain unchanged.
- [ ] `/checkout` adapts long requested-service text, quote line items, totals, payment-method rows, add-card state, empty methods, reload warning, errors, and the pay action without collisions or clipped controls.
- [ ] Checkout missing-id/loading/load-error states remain responsive through the shared shell, while booking-status handoffs, server-priced quote rendering, simulated-card addition, selected method, 409 reload behavior, and success navigation remain unchanged.
- [ ] No real payment capability, client-side price derivation, or payment-policy behavior is introduced; the UI continues to render server-provided quote values and the existing simulated payment-method contract.
- [ ] Long text, zero/one/multiple payment methods, expired/stale quotes, request failures, and submission states remain vertically scrollable and accessible where applicable.
- [ ] Focused RED/GREEN tests cover the route-group layout policy; existing booking-wizard, booking, checkout, continuation, and state/action tests remain green.
- [ ] Browser QA at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900` reports no page-level horizontal overflow, clipped primary controls, unreadable wrapping, or inaccessible actions.
- [ ] Product tests, workspace typecheck, Expo web export, and all repository CI-equivalent checks pass; validation, review, execution, loop, and roadmap evidence is persisted.

## Likely touch points

### Existing files

- `apps/product-app/app/booking-wizard.js`
- `apps/product-app/app/checkout.js` only if route-level loading/error composition needs a focused repair
- `apps/product-app/src/features/booking/booking-wizard-screen.js`
- `apps/product-app/src/features/booking/booking-screen.js` only for issues demonstrated by the browser audit
- `apps/product-app/src/features/booking/checkout-screen.js`
- `apps/product-app/src/features/booking/booking-wizard-actions.test.js` only to strengthen a preserved interface assertion
- `apps/product-app/src/features/booking/booking-screen-actions.test.ts` only to strengthen a preserved interface assertion
- `apps/product-app/src/features/booking/booking-state.test.ts` only to strengthen a preserved state assertion
- `apps/product-app/src/features/booking/checkout-screen-actions.test.ts` only to strengthen a preserved interface/state assertion
- `apps/product-app/src/features/booking/active-job-route-state.test.ts`
- `apps/product-app/src/features/booking/active-job-screen-actions.test.ts`
- `docs/planning/13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`

### Expected new files

- `apps/product-app/src/shared/customer-booking-layout.js`
- `apps/product-app/src/shared/customer-booking-layout.test.js`
- `.agent/reports/loops/60-core-delivery-loop/checkpoint.md`
- `.agent/reports/validation/60-booking-checkout-responsive.md`
- `.agent/reports/code-reviews/60-booking-checkout-responsive.md`
- `.agent/reports/execution-reports/60-booking-checkout-responsive.md`

The executor may choose a narrowly feature-local policy instead of the expected shared filename when source inspection proves cleaner ownership. It must remain pure, testable, and layered on `resolveResponsiveLayout` rather than defining new breakpoint thresholds.

## Existing patterns to follow

- Reuse `resolveResponsiveLayout` for deterministic width classification and `useResponsiveLayout` for React Native window updates.
- Follow the keyboard-aware, safe-area-aware bottom editor pattern established on `/home-triage` by #58.
- Keep `ProductScreenShell` as the responsive wrapper for the legacy `/booking` and checkout missing/loading/error states.
- Keep route files focused on session, state, and navigation orchestration; place responsive presentation decisions in a pure helper and screen components.
- Keep `loadCheckoutData`, `addPaymentMethodForCheckout`, `submitCheckout`, `submitBooking`, and `submitBookingRequest` unchanged unless a regression test proves a required correctness fix inside #60 scope.
- Treat `design/booking_flow` and `design/payment_checkout` as visual references only. Do not add Apple Pay, real card fields, or invented pricing capabilities.

## Validation Contract

### Assertions (written before implementation)

- [ ] Widths `320`, `360`, `390`, and `430` resolve to phone-safe booking decisions with bounded gutters/card padding and stacked or wrapping compositions where required.
- [ ] Intermediate widths use compact decisions, and `1024` retains an intentional wide presentation without changing route behavior.
- [ ] Missing, non-finite, zero, and negative widths fail closed through the existing phone-safe responsive classification.
- [ ] Booking-wizard urgency options stack before their labels/helper text become cramped; changing urgency still updates only the selected UI state and submission value.
- [ ] The booking-wizard header, long location, description input, payment note, summary, and fixed confirmation area stay within document width and remain vertically reachable.
- [ ] Address editing remains keyboard/safe-area aware and preserves trimmed/default-address behavior plus Cancel/Save semantics.
- [ ] Booking-wizard errors do not hide or collide with the editor or confirmation control, and double submission remains guarded.
- [ ] `submitBooking` continues to send the authenticated request with the same `requestedService`, `serviceCategory`, `urgency`, `customerLocation`, and optional provider hint semantics.
- [ ] The legacy booking route preserves unauthenticated redirect/sign-out, blank-submit guard, error rendering, submitted confirmation, and `/active-job?bookingId=...` navigation.
- [ ] Checkout summary rows wrap or stack before long labels, large formatted totals, or currency values collide.
- [ ] Checkout payment-method rows remain readable with long brand/label strings and zero, one, or multiple methods; selection/add-card controls remain reachable.
- [ ] Missing booking id, loading, load error/retry, loaded, needs-reload, inline error, adding-card, submitting, and successful checkout states retain their existing semantics.
- [ ] Completed/unaccepted/already-paid/expired-or-transitioned checkout states keep their existing handoffs; quote creation is not introduced for already-paid bookings.
- [ ] Quote amounts remain server-provided and client formatting-only; the responsive slice adds no real card fields, payment method, price calculation, payment retry policy, or backend request.
- [ ] Existing responsive, booking-wizard, booking, checkout, continuation, and state/action suites pass unchanged unless an assertion is deliberately strengthened without changing behavior.
- [ ] `pnpm --filter @quickwerk/product-app test` passes with zero failures.
- [ ] `pnpm check` passes with zero errors.
- [ ] Expo web export resolves every modified route and import.
- [ ] Browser QA at the required five viewports reports `scrollWidth <= clientWidth`, no unexpected console/page errors, and accessible primary controls for every normal route state.
- [ ] Secondary/error/handoff/long-content states pass focused browser checks at 320px and 1024px, with parameter/body behavior observed where applicable.
- [ ] All CI-equivalent tests and builds pass.

### Performance bounds

- Responsive layout resolution remains constant-time pure arithmetic with no I/O, polling, timers, list traversal proportional to quote/payment-method count, or manual resize listener.
- Responsive rendering adds zero booking, quote, payment-method, or checkout requests.
- Existing duplicate-submit guards remain effective for booking wizard, legacy booking, add-card, and checkout actions.

### Interface contracts

- No backend, API-client, authentication, authorization, payment, persistence, pricing, matching, or data-retention contract changes.
- `BookingWizard({ category, address, onComplete, onBack, onEdit, isSubmitting, errorMessage })` remains compatible.
- `BookingScreen()` remains session-gated and continues to use `submitBookingRequest`.
- `CheckoutScreen(...)` retains its current quote/payment methods, callbacks, loading flags, errors, reload, and back interface.
- Route names and parameters remain unchanged: `category`, `address`, `providerUserId`, and `bookingId` keep their current meanings.
- `submitBooking`, `submitBookingRequest`, `loadCheckoutData`, `addPaymentMethodForCheckout`, and `submitCheckout` request/response handling remains unchanged.
- The responsive policy stays product-app-local and adds no package-level public API or dependency.

## Implementation plan

1. **Capture baseline and RED proof.** Record the three-route inventory and add failing policy tests for phone, compact, wide, invalid widths, stacked urgency options, summary/payment rows, and safe-area action spacing.
2. **Add the pure route-group layout policy.** Derive presentation values from `resolveResponsiveLayout`; reuse `useResponsiveLayout` in screens and avoid another breakpoint table or dimension listener.
3. **Repair booking wizard composition.** Make the header, location, form sections, urgency choices, summary, and confirmation region phone-safe. Make the address editor keyboard/safe-area aware and prevent error/editor/footer collisions without changing submission logic.
4. **Audit the legacy booking route.** Exercise blank, submitting, error, and submitted states through `ProductScreenShell`; make only evidence-backed responsive changes and preserve its auth/request/navigation behavior.
5. **Repair checkout presentation.** Adapt requested-service copy, line-item and total rows, payment-method labels/selection, add-card, empty/reload/error states, and pay CTA while leaving quote/payment logic untouched.
6. **Update roadmap and loop evidence.** Mark #60 as the booking/payment route-group tracker in the canonical migration plan and persist validation/review/execution/checkpoint artifacts; leave later #55 groups explicit.
7. **Run focused and full verification.** Capture RED/GREEN results, run focused contracts, product tests, workspace typecheck, Expo export, the complete CI-equivalent command set, `git diff --check`, and the browser matrix. Keep disposable screenshots outside the repository and record their paths.
8. **Run review and delivery gates.** Perform a fresh diff review, resolve actionable findings, commit atomically, open a PR fixing #60 and referencing #55, then follow `.agent/workflows/review-pr.md` until CI is green and no actionable feedback remains. Leave the PR open unless the user explicitly authorizes merge.

## Browser QA matrix

| Route/state | Required interactions and observations |
|---|---|
| `/booking-wizard` default/long content | Header/location/form/urgency/payment note/summary remain readable; fill long description, switch urgency, and confirm control remains reachable |
| `/booking-wizard` address editor | Long address stays editable under keyboard model; Cancel/Save remain visible or vertically reachable; saved address reaches the request body |
| `/booking-wizard` validation/submitting/error | Blank description keeps confirm disabled; submitting stays busy/guarded; request error remains distinct without covering primary controls |
| `/booking` blank/error/submitted | Shared shell has no overflow; blank guard, long input, inline error, confirmation details, sign-out, and active-job action remain reachable |
| `/checkout` missing/loading/load error | Responsive shared-shell states show missing id, activity, retry, and explanatory copy without clipping |
| `/checkout` loaded/long quote | Long service and line-item labels, large totals, validity copy, one/multiple payment methods, and pay CTA adapt without collision |
| `/checkout` empty/add/reload/error/submitting | Empty methods, add-card busy/result, stale-total reload, inline payment error, and submitting states remain distinguishable and reachable |
| `/checkout` handoff/success | Existing redirects to active job or booking completion preserve `bookingId`; successful payment navigates to active job |

Run normal states at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900`. Exercise secondary/error/handoff/long-content states at least at `320x640` and `1024x900` when repeating them at every intermediate phone width would add no new signal. Authenticate through the existing customer session flow; use controlled API fixtures only to create deterministic booking/quote/payment states, not to bypass UI contracts.

## Edge cases and failure handling

- Long addresses, descriptions, requested-service names, quote labels, payment labels/brands, booking ids, and error messages must wrap without hiding actions.
- Safe-area and virtual-keyboard pressure must not make booking-wizard address Save/Cancel unreachable.
- The wizard confirmation area must not obscure scroll content; reserve sufficient bottom content space at all widths.
- Urgency helpers may grow vertically without forcing two phone cards into unreadable widths.
- Zero payment methods keeps pay disabled until a simulated method exists; adding a method preserves server-generated last4 behavior.
- Large/negative-looking formatted values are rendered from the server response without client recalculation; layout must remain stable.
- A 409 checkout result keeps the existing reload path; it must not be restyled into an automatic retry or duplicate payment.
- Missing/expired sessions preserve the current redirect/sign-out behavior.
- Viewport changes during form entry must not reset description, urgency, address, selected payment method, or loading/error state.

## Rollback

Frontend, tests, and planning/report documentation only. Reverting the route-group policy, screen composition changes, tests, and documentation restores the previous layout. No database, API, auth, payment, pricing, or deployment rollback is required.

## Verification commands

```sh
pnpm --filter @quickwerk/product-app exec vitest run src/shared/customer-booking-layout.test.js src/shared/responsive-layout.test.js src/features/booking/booking-wizard-actions.test.js src/features/booking/booking-screen-actions.test.ts src/features/booking/booking-state.test.ts src/features/booking/checkout-screen-actions.test.ts src/features/booking/active-job-route-state.test.ts src/features/booking/active-job-screen-actions.test.ts
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-60-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
git diff --check
```

The repository has no lint command. Focused browser QA is required in addition to these commands.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: issue #60 has explicit route boundaries, acceptance criteria, payment-policy exclusions, parent #55 linkage, source/design inspection, a pre-implementation Validation Contract, and reproducible verification commands.
- Remaining gaps: implementation RED/GREEN evidence, browser matrix, validation, review, commit, PR, CI, and CodeRabbit remain intentionally unstarted.
- Next action: run `.agent/workflows/execute.md` with `codex/fix/60-booking-checkout-responsive .agent/plans/60-booking-checkout-responsive.md` when implementation is requested.
