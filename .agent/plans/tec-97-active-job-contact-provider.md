# TEC-97: Contact provider on active-job (live_job_tracking, slice 2 of 3)

## Issue

`design/live_job_tracking/code.html` has a working "Call Provider" button next to "Message". TEC-96 (merged) built the provider identity card (name/photo/vehicle/plate); this slice adds real calling. Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §4: **the privacy gate is the entire risk surface for this slice** — a phone number is more sensitive than a vehicle description, and TEC-96 already demonstrated (the vehicle/plate-on-public-endpoint mistake, caught before merge) how easy it is to get this wrong.

The phone number already exists — it's how customers sign in (phone+OTP, TEC-91) — but today it's only used as a lookup key (`otpByPhone`/`usersByPhone` in the in-memory auth repo) with no reverse `userId → phone` lookup, and Postgres stores it but never returns it. This is a small storage addition; the endpoint's authorization is the actual work.

- **Acceptance criteria:**
  1. `AuthSessionRepository` gains `getPhoneByUserId(userId): Promise<string | null>`, implemented in both the in-memory repo (new reverse map, populated in `verifyOtp`) and the Postgres repo (`SELECT phone FROM users WHERE id = $1`). Returns `null` for email/password-only accounts (no phone on file), not an error.
  2. New `GET /api/v1/bookings/:bookingId/contact`, same booking-party authorization as the existing `GET .../payment` and `GET .../provider-identity` (TEC-96): the requester must be the booking's customer or its assigned provider, **and** `status === 'accepted'`. Returns the *counterpart's* phone (provider→customer's request gets the provider's phone; symmetric authorization, matching the existing sibling endpoints — only the frontend currently wires a "Call" affordance for the customer role, since that's what the mockup shows).
  3. **Never** exposed via any public, list, or discovery endpoint — this route is the only path to a phone number anywhere in the API surface.
  4. `active-job-screen.js`'s provider-identity card gets a "Call Provider" button (customer view only) using `Linking.openURL('tel:' + phone)`, shown only when a phone is actually returned (no fabricated/placeholder number, no button at all if the provider has no phone on file — e.g. an email/password test account).
  5. `pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app typecheck` and `test` pass; `pnpm -r typecheck` clean.
  6. **Denial-path tests written before the happy path**: non-party customer/provider → 403; booking not yet `accepted` → no phone returned; unknown booking → 404. Confirmed via `bookings.service.provider-identity.test.ts`'s pattern (TEC-96 already has this exact shape for identity — mirror it for contact).
  7. Browser/API verification: real accepted booking, confirm the endpoint returns the correct phone only once accepted and only to the booking parties; confirm a non-party 403s.

## Plan

**Backend (`services/platform-api/src/auth`):**
- `domain/auth-session.repository.ts`: add `getPhoneByUserId(userId: string): Promise<string | null>` to the `AuthSessionRepository` interface.
- `infrastructure/in-memory-auth-session.repository.ts`: add `phoneByUserId: Map<string, string>`, populate it alongside `usersByPhone` in `verifyOtp`, implement the new method as a plain map lookup.
- `infrastructure/postgres-auth-session.repository.ts`: implement via `SELECT phone FROM users WHERE id = $1::uuid` (email/password accounts have `phone IS NULL` — return `null`, not throw).
- `auth.service.ts`: thin `getPhoneByUserId(userId): Promise<string | null>` wrapper delegating to the repository.

**Backend (`services/platform-api/src/bookings`):**
- `bookings.service.ts`: inject `AuthService` (already available — `BookingsModule` imports `AuthModule`). New `getBookingContact(session, bookingId)`: same booking-lookup + party-authorization + `status === 'accepted'` gate as `getBookingProviderIdentity`; resolves the counterpart's userId from session role, calls `authService.getPhoneByUserId(counterpartUserId)`, returns `{ phone: string | null }`.
- `bookings.controller.ts`: new `GET /:bookingId/contact` route, same shape as `/:bookingId/provider-identity`.
- Tests: new `bookings.service.contact.test.ts` mirroring `bookings.service.provider-identity.test.ts` — denial paths (non-party, wrong status, unknown booking) written first, then the happy path for both roles.

**Frontend contract (`packages/api-client`):**
- `bookingApiRoutes.contact` + `createGetBookingContactRequest(sessionToken, bookingId)`.

**Frontend (`apps/product-app/src/features/booking`):**
- `active-job-screen-actions.ts`: extend `loadProviderIdentity` with a third parallel fetch (the new contact endpoint) merged into `ProviderIdentitySummary.phone?: string` — best-effort, same graceful-degradation pattern as the rating fetch (a contact-fetch failure doesn't blank out the rest of the card).
- `active-job-screen.js`: `ProviderIdentityCard` gets a "Call Provider" button using `Linking` from `react-native`, rendered only when `identity.phone` is set.

## Finding: providers have no phone on file today

Verified during E2E testing: customers authenticate via phone+OTP (TEC-91) and end up with a phone number on file; providers authenticate via email/password (TEC-92) and never do. The backend authorization/lookup is symmetric and correct (verified both directions — confirmed a provider correctly receiving the phone of a phone-authenticated customer, and a customer's `Call Provider` button correctly staying hidden when the assigned provider has no phone), but **in practice, no real provider account today has a phone to expose, so the "Call Provider" button will not appear for any current real booking** — not a bug, the code is doing exactly what it should (never fabricate a number), but it means this slice's UI is currently dormant pending a follow-up (out of scope here) to capture a phone number during provider onboarding/verification.

## Not in scope

- Provider calling the customer — backend is symmetric (same authorization check as any booking party), but no UI wired for it yet; the mockup only shows customer→provider calling.
- Real telephony/VoIP integration — this is a plain `tel:` link handing off to the device's native phone app, not an in-app call.
- Live GPS/ETA/distance — slice 3, separate PR.

## Verification

```bash
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus real-backend verification: seed a provider with a phone-authenticated session (or confirm null-phone graceful handling for email/password test accounts), accept a booking, confirm `GET /bookings/:id/contact` returns the phone only to booking parties and only once accepted.
