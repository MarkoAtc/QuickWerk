# TEC-96: Provider identity on active-job (live_job_tracking, slice 1 of 3)

## Issue

`design/live_job_tracking/code.html` shows a provider profile card (photo, name, verified badge, rating, vehicle + license plate) on the active-job screen. Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md`, this is being built for real, not skipped or descoped — this ticket is slice 1 of 3 (provider identity; contact/phone is slice 2, simulated en-route ETA/distance is slice 3, each its own PR).

Scoped in a prior investigation: rating is already real data (`reviews` module), provider name/bio already real (`ProviderProfile`), only photo/vehicle/plate are missing fields. No new backend subsystem needed — this is additive fields on an existing domain type plus wiring the frontend to fetch and render them.

- **Acceptance criteria:**
  1. `ProviderProfile` gains `photoUrl?`, `vehicleDescription?`, `licensePlate?` (all optional, settable via the existing `PUT /me/profile` upsert, same pattern as `bio`/`serviceArea`).
  2. Active-job screen (customer view, once a provider is assigned) shows a real provider-identity section: name (real), average rating + review count (computed from the existing public `GET /providers/:id/reviews` endpoint — no backend change needed for this part), photo if set (graceful initials-avatar fallback if not), vehicle/plate line if set (omitted entirely if not — no fabricated placeholder).
  3. Provider view of active-job is unaffected (this section is customer-facing only, matching the mockup which is the customer's tracking view).
  4. `pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app typecheck` and `test` pass; `pnpm -r typecheck` clean.
  5. Browser-driven verification: a customer with an accepted booking sees the provider-identity section render with real data; no console errors.

## Plan

**Backend (`services/platform-api/src/providers`):**
- `domain/provider-profile.repository.ts`: add the 3 optional fields to `ProviderProfile` and `UpsertProviderProfileInput`.
- `infrastructure/in-memory-provider-profile.repository.ts`: handle them in `upsertProfile` (same trim-or-keep-existing-on-partial-update pattern already used for `bio`/`serviceArea`).
- `providers.service.ts`: extend `UpsertProfileInput`, pass fields through in `upsertProfile()`. **Privacy split** (added after an initial pass wired vehicle/plate into the public discovery endpoint — caught in review before merge, not shipped): `serializeProfile()` (full, includes vehicle/plate) is used only by the owner's own `/me/profile` view; a new `serializePublicProfile()` (excludes vehicle/plate) is used by `getPublicProviderById`/`listPublicProviders`. A vehicle + license plate identifies a person's vehicle — safe for "your assigned provider on an accepted booking" (see below), not safe for "anyone who can guess a providerUserId."
- `providers.controller.ts`: extend `UpsertProfileBody`.
- New `ProvidersService.getProviderIdentitySummary(providerUserId)`: unrestricted-by-`isPublic` lookup (name/photo/vehicle/plate) for use by a caller that has *already* authorized the requester some other way — i.e. the booking-scoped endpoint below, not a public route itself.
- Tests: extend existing provider-profile/service tests for the new fields (set, partial-update-preserves-existing, serialization) plus a discovery test asserting vehicle/plate are absent from public responses.

**Backend (`services/platform-api/src/bookings`) — the actual privacy gate:**
- New `BookingsService.getBookingProviderIdentity(session, bookingId)`: same booking-party authorization as `getBookingPayment` (customer must own the booking, provider must be the assigned provider), plus `booking.status !== 'accepted'` returns `null` rather than data. Only then calls `providersService.getProviderIdentitySummary`.
- New route `GET /api/v1/bookings/:bookingId/provider-identity` on `BookingsController`, same shape as the existing `GET /:bookingId/payment`.
- Tests: authorization (customer/provider party checks, 403 for non-parties, 404 for unknown booking) and the not-yet-accepted → `null` case.

**Frontend contract (`packages/api-client`):**
- `PublicProviderProfile` and `UpsertProviderProfileBody` types: add the 3 fields (photo stays public; vehicle/plate stored but never serialized onto the public type in practice).
- New `bookingApiRoutes.providerIdentity` + `createGetBookingProviderIdentityRequest(sessionToken, bookingId)`.

**Frontend (`apps/product-app/src/features/booking`):**
- `active-job-screen-actions.ts`: `loadProviderIdentity({ sessionToken, bookingId, providerUserId })` fetches name/photo/vehicle/plate from the new booking-scoped endpoint (authenticated), and rating separately from the pre-existing public `GET /providers/:id/reviews` (unauthenticated, unchanged — rating was never the privacy concern). Best-effort: any failure resolves to `null`, same graceful-degradation pattern as the payment fetch.
- `active-job-presenter.ts`: extend `ActiveJobViewModel` with an optional `providerIdentity`, only populated for the customer viewer role.
- `active-job-route-state.ts`: thread the loader through with the same injectable-impl pattern as `loadBookingContinuationImpl`/`presentActiveJobImpl` (testability).
- `active-job-screen.js`: add a provider-identity card matching the mockup's visual language (photo/initials avatar, name, rating badge if reviews exist, vehicle/plate line only if set) — rendered only when `model.providerIdentity` is present.

## Not in scope (this slice)

- Phone/calling ("Call Provider") — slice 2, needs its own privacy-scoped lookup.
- Live GPS marker, ETA, distance, the map visual — slice 3, simulated feed.
- Provider-side photo upload UI (provider setting their own photo/vehicle/plate) — the fields are added to the API and settable via the existing profile upsert, but no new provider-facing settings screen is built here; can be set via the existing profile endpoint. If a real upload UI is wanted for providers, that's a follow-up.
- Real photo upload backend beyond what already exists (`requestUploadUrl` presigned-URL stub) — `photoUrl` is just a string field on the profile; how a real URL gets there (upload flow) is not rebuilt here.

## Verification

```bash
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus browser-driven check via `.claude/skills/browser-drive`.
