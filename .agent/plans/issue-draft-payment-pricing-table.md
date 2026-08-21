# Issue Draft — Real itemized pricing table (payment sequence, slice 1 of 4)

## Title
Payment sequence slice 1: replace flat `estimatePaymentAmountCents` with a real itemized pricing table

## Problem
`estimatePaymentAmountCents()` (`services/platform-api/src/bookings/bookings.service.ts:899`) is the entire current "pricing engine": it ignores its `requestedService` argument and always returns a flat 12000 cents (€120), used only at booking completion to feed `capturePaymentForBooking`. The `design/payment_checkout` mockup shows a real itemized total (call-out fee + labor + platform fee = a computed total, e.g. $227.50), which the backend cannot currently produce for any booking. Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §2/§5, this is slice 1 of the 4-part payment sequence and everything downstream (payment-method storage, the checkout endpoint's immutable quote, the checkout screen) depends on it existing first.

Research finding that changes scope from the original assumption: `requestedService` is **not** a bounded service type today — it's a free-text string built by joining `category / issueType / urgency` client-side (`apps/product-app/src/features/booking/booking-wizard-actions.js`) before it ever reaches the API. A bounded `category` (8 ids: emergency, plumbing, electrical, carpenter, locksmith, painting, cleaning, handyman) and a bounded `urgency` (`urgent` "premium rate applies" / `scheduled`) already exist as UI state but are discarded into the flattened string and never persisted as discrete fields. A pricing table cannot key off free text reliably, so this slice must also plumb `category` and `urgency` through booking creation end-to-end (frontend → API → DB column) as the precondition for computing a real quote from booking data, per doc 14 §4's "server creates an immutable quote from booking data" constraint (full quote/checkout envelope is slice 3, not this slice).

There is also no Drizzle ORM anywhere in this repo (bookings persistence is raw SQL, payments persistence is in-memory only) — contrary to the assumption made when this slice was first scoped. Rate data belongs in a pure, stateless module (same shape as `bookings/simulated-tracking.ts` from TEC-98), not a new persisted rates table — nothing in this slice needs admin-configurable rates.

## Goal
Compute a real, deterministic, itemized price from booking data (category + urgency) instead of a flat constant, and use that computed amount at the existing completion-capture call site — with no change to the payment write path itself (still one capture, at completion; the pre-job quote/checkout envelope is explicitly out of scope, deferred to slice 3).

## Acceptance Criteria
- [x] New pure module `services/platform-api/src/bookings/pricing-table.ts`: exports `PRICING_TABLE_VERSION` and `computeBookingPrice(category: string | null, urgency: string | null): PricedBreakdown` where `PricedBreakdown` = `{ calloutFeeCents, laborCents, platformFeeCents, totalCents, lineItems: [{ label, amountCents }], pricingTableVersion }`. No I/O, no state — same testability precedent as `simulated-tracking.ts`.
- [x] Per-category base rates (hourly rate + a fixed estimated-hours default per category — the mockup's "2.0 hours" is not derivable from anything that exists today, so it's a simulated fixed estimate, not a measurement) for all 8 existing category ids, plus a documented fallback for `category: null` (legacy/older bookings created before this field existed) using a generic/handyman-equivalent rate so nothing 500s.
- [x] `urgency: 'urgent'` applies the mockup's "premium rate applies" copy as an actual rate multiplier on labor (and/or callout); `'scheduled'` and `null` use the base rate.
- [x] Platform fee: flat cents amount (matches mockup's $12.50 exactly for the reference category/urgency combination) — explicitly not a percentage, documented as a simulated-fidelity choice matching how payment capture is already "recorded, not processed."
- [x] `category` and `urgency` plumbed end-to-end as new **optional, nullable** fields: `booking-wizard-actions.js` sends them alongside (not replacing) the existing flattened `requestedService` string → `POST /bookings` DTO → `BookingsService.createBooking` → both booking repositories (Postgres raw-SQL + in-memory) → new migration `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_category TEXT, ADD COLUMN IF NOT EXISTS urgency TEXT` (nullable, unconstrained at DB level — validated against known ids at the service layer only, matching how `requestedService` itself isn't DB-enum-constrained).
- [x] `bookings.service.ts:899` `estimatePaymentAmountCents` is removed; `completeBooking`'s capture call site (`bookings.service.ts:592-601`) uses `computeBookingPrice(bookingToComplete.serviceCategory, bookingToComplete.urgency).totalCents` instead. Currency stays `'EUR'` (the mockup's `$` glyph is a design-comp artifact, not a currency decision — call this out explicitly so it doesn't come back as a review comment).
- [x] `capturePaymentForBooking`'s existing `requestedService` trim/validate/idempotency contract (`payments.service.ts:19`) is unchanged — this slice only changes the *amount* fed in, not the payment capture contract itself.
- [x] Tests: `pricing-table.test.ts` — pure function across all 8 categories × both urgency values × `null`/`null` fallback (exhaustive, same style as TEC-98's timeline tests); `bookings.service.test.ts` update — `completeBooking` captures the computed (not flat 12000) amount for a booking with a known category.
- [x] `pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app typecheck` and `test`, `pnpm -r typecheck` all pass.
- [x] Real-backend verification: create a booking with a known category via the wizard, accept it, complete it, confirm the captured payment amount matches `computeBookingPrice` for that category/urgency (not 12000).

## Not in scope (explicitly deferred)
- Payment-method storage (slice 2).
- The pre-job checkout endpoint, the immutable quote object (line items + expiry + quote id), and the decision of whether checkout finalizes or authorizes payment (slice 3) — this slice only fixes what completion-capture computes, it does not add a new capture call site or a quote envelope.
- The `/checkout` screen (slice 4).
- Making `issueType`/free-text description part of pricing — only `category` and `urgency` (both already bounded on the frontend) are plumbed; free-typed `issueType` stays cosmetic/descriptive only.
- Admin-configurable or DB-persisted rate tables — rates live in code as a pure module, matching the `simulated-tracking.ts` precedent; nothing here asks for runtime-editable rates.

## Labels (suggested)
- enhancement
- backend
- frontend
- payments

## Priority
P1 (blocks the rest of the payment sequence)

---

# Plan

## Risk/TDD classification
`risky-logic` — this slice changes what a live booking-completion payment capture actually charges (flat €120 → computed itemized total). The RED proof: a `completeBooking` test asserting the captured amount equals `computeBookingPrice(...)`'s total for a known category, written and run failing (against the old flat-12000 behavior) before `estimatePaymentAmountCents` is removed.

## Validation Contract
### Assertions (written before implementation)
- [x] `computeBookingPrice(category, urgency)` returns a deterministic, correctly-summed `{ calloutFeeCents, laborCents, platformFeeCents, totalCents, lineItems, pricingTableVersion }` for all 8 known category ids × `'urgent'`/`'scheduled'`, and for the `null`/unrecognized fallback case.
- [x] `urgent` produces a strictly higher `totalCents` than `scheduled` for the same category.
- [x] `completeBooking` captures `computeBookingPrice(bookingToComplete.serviceCategory, bookingToComplete.urgency).totalCents` — not `12000` — for a booking created with a known `serviceCategory`.
- [x] A booking with no `serviceCategory`/`urgency` (legacy data, or any path that omits them) still completes successfully via the documented fallback rate — no new failure mode on existing data.
- [x] `capturePaymentForBooking`'s existing `requestedService` trim/validate/idempotency behavior is unchanged (same throws-if-empty contract).
- [x] Type-check passes with zero errors across all workspaces (`pnpm -r typecheck`).
- [x] Lint/tests pass with zero failures (`pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app test`).

### Performance bounds
- Not applicable — `computeBookingPrice` is a pure, synchronous, no-I/O function; no latency-sensitive path is introduced.

### Interface contracts
- `POST /bookings` (create): request body gains two new **optional** fields, `serviceCategory?: string` and `urgency?: string` — additive, no existing field renamed/removed, no breaking change for callers that omit them.
- `GET`/booking read paths: booking records gain `serviceCategory: string | null` and `urgency: string | null` alongside existing fields.
- Booking completion (`completeBooking` → `capturePaymentForBooking`): `amountCents` input changes from a hardcoded constant to `computeBookingPrice(...).totalCents`; all other fields on `CreatePaymentInput` (`bookingId, customerUserId, providerUserId, currency, capturedAt, correlationId, requestedService`) are unchanged.

## Branch
`feature/payment-pricing-table-slice1`

## Plan file path
`.agent/plans/issue-draft-payment-pricing-table.md` (this file)

## Backend (`services/platform-api/src/bookings`)
- New pure module `pricing-table.ts`:
  - `PRICING_TABLE_VERSION = 'v1'`
  - `CATEGORY_RATES: Record<CategoryId, { calloutFeeCents, hourlyRateCents, estimatedHours }>` for the 8 known ids + a named fallback constant used when `category` is `null`/unrecognized.
  - `URGENCY_MULTIPLIERS: Record<'urgent' | 'scheduled', number>` (`urgent` > 1.0, `scheduled` = 1.0); unrecognized/`null` urgency treated as `scheduled`.
  - `PLATFORM_FEE_CENTS` flat constant.
  - `computeBookingPrice(category, urgency)` → pure, no I/O; returns itemized breakdown + total + version.
- `bookings.service.ts`:
  - `createBooking` input type gains optional `serviceCategory?: string; urgency?: string`, persisted through to both repositories alongside existing fields (additive, no existing field removed/renamed).
  - Remove `estimatePaymentAmountCents` (line 899); its one call site (line 596, inside `completeBooking`) switches to `computeBookingPrice(...)`.
- `bookings.controller.ts`: DTO gains the two optional fields (mirrors existing optional-field handling for `requestedService`/`customerLocation`).
- Both booking repositories (`infrastructure/postgres-booking.repository.ts` raw SQL, `infrastructure/in-memory-booking.repository.ts`) gain the two new nullable fields on insert/select/mapping, following the exact pattern already used for `requestedService`/`customer_location`.
- `packages/domain/src/index.ts`: extend the booking-related types (the 4 existing `requestedService: string` sites) with the two new optional fields.
- New migration `services/platform-api/migrations/0011_booking_service_category_urgency.sql`, same shape as `0009_booking_customer_location.sql`:
  ```sql
  BEGIN;
  ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS service_category TEXT,
    ADD COLUMN IF NOT EXISTS urgency TEXT;
  COMMIT;
  ```
- Tests:
  - `pricing-table.test.ts`: all 8 categories × `urgent`/`scheduled`, plus `null`/`null` fallback — assert deterministic, correctly-summed totals and that `urgent` produces a strictly higher total than `scheduled` for the same category.
  - Update `bookings.service.test.ts` (or add a focused completion test): a booking created with a known `serviceCategory` captures the matching computed total on completion, not `12000`.

## Frontend (`apps/product-app/src/features/booking`)
- `booking-wizard-actions.js`: keep building the existing flattened `requestedService` string unchanged (still useful as a human-readable description); additionally send `category` and `urgency` (both already held as component state, both already bounded ids) as separate fields in the create-booking call.
- `packages/api-client`: extend the create-booking request payload type/builder with the two optional fields.
- No screen/UI change required in this slice — the wizard already collects both values, this only stops discarding them before the network call. The `/checkout` screen itself is slice 4.

## Edge cases / failure handling
- Booking created before this change (or via any path that omits the new fields): `serviceCategory`/`urgency` are `null` → pricing falls back to the documented default rate, completion still succeeds (no new failure mode introduced on existing data).
- Unrecognized `category`/`urgency` string (e.g. future frontend value not yet in `CATEGORY_RATES`): treat as fallback, do not throw — completion-capture must never fail because of an unknown category, since that would be a regression on an already-shipped flow.

## Rollback considerations
- Additive-only DB migration (new nullable columns) — safe to roll forward/back without data loss.
- `estimatePaymentAmountCents` removal is the only breaking internal change; if reverted, the flat-12000 behavior returns immediately since the old method's logic is fully replaced (not left as dead code) — no partial state.

## Verification
```bash
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```
Plus real-backend verification per the acceptance criteria above (create → accept → complete a booking with a known category, confirm captured amount is the computed itemized total, not 12000).
