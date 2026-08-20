# TEC-98: Simulated en-route tracking on active-job (live_job_tracking, slice 3 of 3)

## Issue

Final slice of `design/live_job_tracking` design parity (TEC-96 provider identity, TEC-97 contact provider, both merged). The mockup's remaining piece is the live-map/ETA drawer: "Arriving in 12 mins", "3.2 km", progress dots, "On the way to your location". Per `docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md` §2/§4: no real GPS subsystem exists or is being built here — the decision is a **simulated en-route status feed**, explicit about being simulated in the API contract (not just a code comment), with defined terminal behavior and no reset-on-reload.

## Design

A deterministic, server-computed (not persisted, not client-timed) countdown anchored to the booking's `accepted` transition timestamp, which already exists in `statusHistory`:

- `acceptedAt` = the `changedAt` of the `statusHistory` entry with `to === 'accepted'`.
- Fixed simulated trip: `SIMULATED_TRIP_DURATION_SECONDS = 720` (12 min, matching the mockup's initial state), `SIMULATED_TRIP_DISTANCE_KM = 3.2` (matching the mockup).
- At query time `now`: `elapsedSeconds = clamp(now - acceptedAt, 0, duration)`. `etaSeconds = duration - elapsedSeconds`, `distanceKm = totalDistance * (etaSeconds / duration)`, both linear and monotonically decreasing.
- `status: 'en-route'` while `etaSeconds > 0`, `'arrived'` once it hits 0 — holds there (doesn't go negative, doesn't wrap).
- **Computed on every read, not stored.** This is what makes "no reset on reload/retry" free: there is no counter to reset, only a fixed anchor timestamp and the current wall clock. Two requests a second apart return numbers 1 second apart, deterministically, from any client, after any number of retries.
- Marked in the API response with `source: 'simulated'` (explicit, not just a doc/code comment — CodeRabbit's constraint from the planning doc §4).

**Not attempting**: moving map markers, animated route lines, or real distance/geo calculation. The map visual (`MapStage` in `active-job-screen.js`) stays exactly as decorative as it already honestly was — this slice replaces the placeholder *text* card with real (simulated, labeled) ETA/distance numbers, not the map graphic itself. Matches the already-established precedent (TEC-93 skipped the mockup's marker-bounce/pulsing-ring CSS animations as decorative detail, not core to the screen's honesty).

- **Acceptance criteria:**
  1. New booking-scoped `GET /bookings/:bookingId/tracking`: same party-authorization pattern as `/provider-identity` and `/contact` (consistency with established sibling endpoints, even though ETA/distance is lower-stakes than phone/vehicle). Returns `null` when booking isn't `accepted` (mirrors the sibling endpoints' "not applicable yet" shape).
  2. Response always includes `source: 'simulated'` so no consumer can mistake it for real telemetry.
  3. Deterministic: same booking, same query time → same numbers, regardless of how many times queried or reloaded.
  4. `active-job-screen.js`: the placeholder card in `MapStage` is replaced with real ETA/distance/status text once tracking data is available (customer view only, matching TEC-96/97's role-gating); falls back to the existing honest placeholder copy when tracking is null (not yet accepted, or provider viewer).
  5. `pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app typecheck` and `test` pass; `pnpm -r typecheck` clean.
  6. Tests for the pure simulation function across the timeline (elapsed=0, mid-trip, exactly at duration, past duration/clamped) before the service-level authorization tests (same denial-first pattern as TEC-97, though here it's about correctness clamping more than privacy).
  7. Browser/API verification against a real accepted booking: confirm the endpoint returns decreasing-over-time, `source: 'simulated'`-tagged values, and the UI renders them.

## Plan

**Backend (`services/platform-api/src/bookings`):**
- New pure module `simulated-tracking.ts`: `computeSimulatedTracking(acceptedAt: string, now: Date)` — no I/O, no state, easy to test exhaustively across the timeline.
- `bookings.service.ts`: `getBookingTracking(session, bookingId)` — same booking-lookup + party-authorization as `getBookingContact`/`getBookingProviderIdentity`; `status !== 'accepted'` → `tracking: null`; otherwise resolve `acceptedAt` from `statusHistory` and call the pure function.
- `bookings.controller.ts`: `GET /:bookingId/tracking`, same shape as the sibling routes.
- Tests: `simulated-tracking.test.ts` (pure function, the timeline cases above) + `bookings.service.tracking.test.ts` (authorization/gating, mirroring `bookings.service.contact.test.ts`'s structure).

**Frontend contract (`packages/api-client`):**
- `bookingApiRoutes.tracking` + `createGetBookingTrackingRequest(sessionToken, bookingId)`.

**Frontend (`apps/product-app/src/features/booking`):**
- `active-job-screen-actions.ts`: `loadTracking({ sessionToken, bookingId })`, same best-effort/graceful-degradation shape as the other booking-scoped loaders.
- `active-job-presenter.ts` / `active-job-route-state.ts`: thread through as an optional `tracking` field on the view model, customer-role-gated.
- `active-job-screen.js`: `MapStage`'s bottom placeholder card shows real "Arriving in N mins" / "X.X km" / status text when `tracking` is present; unchanged placeholder copy otherwise. No visible "simulated" disclaimer in the UI — the mockup has none, and this is a decorative-status concern (contract transparency for future maintainers, not a user-facing money/safety claim like the pricing case) — the API contract carrying `source: 'simulated'` is the guardrail, matching the scope of what CodeRabbit's constraint actually asked for.

## Not in scope

- Real GPS/device location tracking.
- Moving map markers / animated route lines.
- Provider-facing tracking UI (backend stays party-symmetric like the sibling endpoints; no frontend built for the provider role, matching TEC-97's precedent).
- Cancel/complete transition handling beyond "no longer accepted → no tracking data" — there's no dedicated cancel flow in this app today (only decline pre-acceptance and complete post-job), so this naturally falls out of the existing state machine without new work.

## Verification

```bash
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus real-backend verification: accept a booking, query `/tracking` twice a few seconds apart, confirm `etaSeconds`/`distanceKm` decreased consistently and `source` is `'simulated'`.
