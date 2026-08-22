# Issue Draft — Payment-method storage (payment sequence slice 2 of 4)

## Title
Payment sequence slice 2: simulated payment-method storage (new domain module)

## Problem
The booking wizard's `PaymentSection` (`apps/product-app/src/features/booking/booking-wizard-screen.js`) is entirely decorative today: hardcoded "Apple Pay" / "Add a payment method" rows, with local `paymentMethod` state that is never sent anywhere. There is no payment-method storage anywhere in the backend. Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §2/§4/§5, slice 2 of the payment sequence is a new payment-method domain module with **simulated fidelity**: a fake label/last4 per customer, no real card data ever touching the server.

## Goal
Stand up a `payment-methods` domain module (mirroring the existing `payments`/`payouts`/`invoices` module shape exactly) that lets an authenticated customer add and list simulated payment methods. The server generates the fake `last4` itself — the client never supplies real card data, and the service actively rejects any PAN/CVV/expiry-shaped input as defense-in-depth even though the declared request type has no room for it.

## Acceptance Criteria
- [x] New module `services/platform-api/src/payment-methods/` mirrors the `payouts`/`invoices` shape: `domain/payment-method.repository.ts` (interface + `PAYMENT_METHOD_REPOSITORY` symbol + types), `infrastructure/in-memory-payment-method.repository.ts`, `payment-methods.service.ts`, `payment-methods.controller.ts`, `payment-methods.module.ts`, registered in `app.module.ts`. In-memory only for this slice (no Postgres repo — matches `payments`, not `payouts`/`invoices`; nothing here needs cross-restart persistence yet).
- [x] `PaymentMethodRecord`: `{ paymentMethodId, customerUserId, label, last4, brand, source: 'simulated', createdAt }`. `source: 'simulated'` (not a boolean) for consistency with the existing `computeSimulatedTracking`/pricing-table `source`/`pricingTableVersion` convention already established in this repo.
- [x] `POST /api/v1/customers/me/payment-methods` (customer-role gated, same auth boilerplate as `payouts.controller.ts`): body accepts only `{ label?: string, brand?: string }` — friendly display fields. The server generates `last4` (via `randomInt` from `node:crypto`, matching this codebase's existing use of `node:crypto` for `randomUUID`, not `Math.random()`) itself; it is never accepted from the client. **Whitelist, not blocklist**: reject with 400 (before touching the repository) if the body contains *any* key other than `label`/`brand` — a blocklist of card-shaped key names is guessable-around (`card_number`, `cardNo`, `securityCode`, ...); a whitelist can't be bypassed by a naming variant.
- [x] `GET /api/v1/customers/me/payment-methods` (customer-role gated): lists the caller's own payment methods only, newest first.
- [x] Breadcrumb/structured logs for this module only ever log `paymentMethodId`, `label`, `last4`, `brand` — never raw request bodies (so a future PAN-shaped field added by mistake can't leak into logs even if the reject-list misses it).
- [x] `packages/api-client`: `paymentMethodApiRoutes`, `createAddPaymentMethodRequest(sessionToken, { label?, brand? })`, `createListMyPaymentMethodsRequest(sessionToken)` — same flat-file `create<Verb><Resource>Request` pattern as existing builders (e.g. `createGetMyPayoutsRequest`).
- [x] Tests: `payment-methods.service.test.ts` (add + list + the PAN/CVV/expiry-shaped-input rejection case + customer-only listing/isolation) and `payment-methods.controller.test.ts` (auth/role gating, mirroring `payouts.controller.test.ts`'s local `createRequest`/`createResponse` fakes).
- [x] `pnpm --filter @quickwerk/platform-api test`, `pnpm -r typecheck` pass.
- [x] Real-backend verification: sign in as a customer, add two simulated payment methods via the API, list them back, confirm `source: 'simulated'` on both and that a PAN-shaped payload (e.g. `{ "cardNumber": "4242..." }`) is rejected with 400.

## Not in scope (explicitly deferred)
- Wiring the booking-wizard's `PaymentSection` to this API — it stays decorative in this slice. Per doc 14 §5's execution sequence, the real UI consumer is the `/checkout` screen (slice 4); wiring a UI to this module now would be premature (the checkout screen's payment-method picker is the actual, designed consumer — there is no separate "manage payment methods" mockup to build toward).
- Deleting/updating a saved payment method — not required by anything in scope yet (the checkout mockup only needs to display/select existing methods). Trivial to add later if a real need shows up.
- The pre-job checkout endpoint / immutable quote object (slice 3) and the `/checkout` screen (slice 4).
- Any real card-processor integration (Stripe/Apple Pay) — simulated fidelity only, consistent with how payment capture already works.

## Labels (suggested)
- enhancement
- backend
- payments

## Priority
P1 (blocks slice 3: the checkout endpoint needs a payment method to reference)

---

# Plan

## Risk/TDD classification
`risky-logic` (money-adjacent input boundary) for the PAN/CVV/expiry rejection path — write the rejection test first, confirm it fails against a stub that has no rejection logic, then implement. `low-risk` for the plain add/list CRUD path (mirrors an already-proven pattern in this repo three times over).

## Validation Contract
### Assertions (written before implementation)
- [x] `POST .../payment-methods` with any key other than `label`/`brand` (e.g. a PAN/CVV/expiry-shaped key) is rejected with 400 and never reaches the repository (assert the in-memory repo's stored count is unchanged after the rejected call).
- [x] `POST .../payment-methods` with only `{ label, brand }` succeeds, returns a record with a server-generated `last4` (4 digits) and `source: 'simulated'`.
- [x] `GET .../payment-methods` returns only the calling customer's own methods (a second customer's call returns an empty list / does not see the first customer's methods).
- [x] Non-customer roles (`provider`, `operator`) are rejected with 403 on both endpoints.
- [x] Type-check passes with zero errors (`pnpm -r typecheck`).
- [x] `pnpm --filter @quickwerk/platform-api test` passes with zero failures.

### Performance bounds
- N/A — not applicable, in-memory CRUD with no external calls, no latency-sensitive path introduced.

### Interface contracts
- `POST /api/v1/customers/me/payment-methods` accepts `{ label?: string, brand?: string }` and returns `{ paymentMethodId, customerUserId, label, last4, brand, source: 'simulated', createdAt }`, or 400 with an error message if any key other than `label`/`brand` is present in the body.
- `GET /api/v1/customers/me/payment-methods` returns `PaymentMethodRecord[]` for the authenticated customer, newest first.

## Branch
`feature/payment-method-storage-slice2`

## Plan file path
`.agent/plans/issue-draft-payment-method-storage.md` (this file)

## Backend (`services/platform-api/src/payment-methods/`, new module)
- `domain/payment-method.repository.ts`:
  - `PaymentMethodRecord`, `CreatePaymentMethodInput { customerUserId, label?, brand?, last4, createdAt }` (note: `last4` is part of the *repository* input since the service generates it before calling the repo — the repo itself doesn't generate anything, matching how other repos in this codebase are pure persistence with no business logic).
  - `PaymentMethodRepository` interface: `createPaymentMethod(input)`, `listPaymentMethodsForCustomer(customerUserId)`.
  - `PAYMENT_METHOD_REPOSITORY` DI symbol.
- `infrastructure/in-memory-payment-method.repository.ts`: `Map<string, PaymentMethodRecord[]>` keyed by `customerUserId`, or a flat array filtered by `customerUserId` (mirror whichever style `in-memory-payout.repository.ts` uses for consistency).
- `payment-methods.service.ts`:
  - `ALLOWED_PAYMENT_METHOD_KEYS = ['label', 'brand']` (whitelist, exported for the test to reference, not duplicate).
  - `addPaymentMethod(session, rawBody)`: reject if `session.role !== 'customer'` (403); reject if `rawBody` contains any key outside `ALLOWED_PAYMENT_METHOD_KEYS` (400, logged as `reason: 'unexpected-field-rejected'` with **no field values**, only the offending key name); generate `last4` via `randomInt(1000, 10000)` from `node:crypto`; call the repository; log only `paymentMethodId`/`last4`/`brand`.
  - `listMyPaymentMethods(session)`: reject if `session.role !== 'customer'` (403); return the repository's list for `session.userId`.
- `payment-methods.controller.ts`: `@Controller('api/v1/customers/me/payment-methods')`, `POST` and `GET`, identical auth boilerplate (`extractBearerToken` → `resolveCorrelationId` → `authService.resolveSessionOrNull` → 401 if null → delegate to service → `HttpException` on `!ok`) as `payouts.controller.ts`.
- `infrastructure/payment-method-repository.provider.ts`: `{ provide: PAYMENT_METHOD_REPOSITORY, useClass: InMemoryPaymentMethodRepository }`, mirroring `payments/infrastructure/payment-repository.provider.ts` exactly (payments is the closest sibling: in-memory only, no Postgres factory).
- `payment-methods.module.ts`: imports `AuthModule`; providers: `PaymentMethodsService`, `InMemoryPaymentMethodRepository`, `paymentMethodRepositoryProvider`.
- Register `PaymentMethodsModule` in `app.module.ts`'s `imports`.
- Tests: `payment-methods.service.test.ts`, `payment-methods.controller.test.ts` (per Validation Contract above).

## Frontend (`packages/api-client` only — no UI wiring this slice)
- `packages/api-client/src/index.ts`: add `paymentMethodApiRoutes`, `createAddPaymentMethodRequest`, `createListMyPaymentMethodsRequest`, following the exact existing flat-file pattern (e.g. `createGetMyPayoutsRequest`).
- No changes to `booking-wizard-screen.js` or any screen — see "Not in scope."

## Edge cases / failure handling
- Empty `label`/`brand`: allowed — both optional, service can default to a generic label (e.g. `'Card'`) if omitted, consistent with `requestedService`'s "default to a sensible generic value" pattern already used in `BookingsService.createBooking`.
- Duplicate `last4` across different payment methods for the same customer: acceptable — these are simulated, fake, randomly generated, and not unique real identifiers; no uniqueness constraint needed.
- A non-customer (`provider`/`operator`) calling either endpoint: 403, consistent with every other customer-scoped endpoint in this codebase.

## Rollback considerations
- New module only, no migration, no changes to any existing table/module/behavior. Fully additive — safe to revert by removing the module registration.

## Verification
```bash
pnpm --filter @quickwerk/platform-api test
pnpm -r typecheck
```
Plus real-backend verification per the acceptance criteria above (add methods, list them, confirm rejection of PAN-shaped input, confirm role gating).
