# Handwerker OnDemand Implementation Handoff and Docking Guide

## 1. Purpose

This document records the exact implementation sequence completed in the latest development pass so any engineer or AI assistant can quickly understand what changed, why it changed, how it was validated, and where to continue safely.

## 2. Baseline Before This Pass

- monorepo and package boundaries were already established
- shared product app had route-level home and auth entry surfaces (`/` and `/auth`)
- auth/session bootstrap endpoint existed in `services/platform-api`
- local auth entry stubs and state derivation existed in `apps/product-app`
- focused state tests existed for `auth-entry-state`
- planning docs declared a temporary UI-first meeting detour and an immediate engineering return task for session-bootstrap fallback test coverage

## 3. What Was Implemented in This Pass

## 3.1 Temporary UI-first detour completion

A single post-auth preview slice was added in the shared product app without changing architecture boundaries:

- added route file: `apps/product-app/app/marketplace-preview.js`
- added feature screen: `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
- preserved existing composition style by reusing:
  - `ProductScreenShell`
  - `ProductRouteLink`
- added navigation entry points:
  - home (`apps/product-app/app/index.js`) now links to `/marketplace-preview`
  - auth entry (`apps/product-app/src/features/auth/auth-entry-screen.js`) now links to `/marketplace-preview` only when auth state resolves to continuation (`continue-to-marketplace`)

## 3.2 Engineering return track completion

Focused session-bootstrap fallback coverage was added:

- new test file: `apps/product-app/src/shared/session-bootstrap.test.ts`
- covered cases:
  - HTTP non-OK response returns fallback with explicit error message
  - thrown fetch error returns fallback with propagated message
  - invalid bootstrap payload values are sanitized to safe defaults while keeping `source: platform-api` for successful transport

## 4. Scope Controls Maintained

## In scope and preserved

- shared `apps/product-app` path
- Expo Router route wiring
- local demo fixtures and preview copy
- disabled/no-op CTA placeholders
- accessibility and testID patterns

## Out of scope and still untouched

- `apps/admin-web`
- persistent backend writes
- payment or production auth expansion
- package boundary restructuring
- cross-platform architecture changes

## 5. Validation Evidence

Commands run from repository root:

- `pnpm check`
- `pnpm --filter @quickwerk/product-app test`

Observed result:

- workspace typecheck passed
- product-app tests passed

## 6. Current Technical Position

The project now has:

- a demonstrable post-auth meeting-safe route in the shared app
- explicit and test-covered session-bootstrap fallback behavior
- unchanged long-term architecture direction

## 7. First Read-only API Docking Slice (Completed)

The recommended first follow-up slice has now been implemented in the same style:

- new platform API endpoint: `GET /api/v1/bookings/preview`
  - file: `services/platform-api/src/marketplace/marketplace.controller.ts`
  - registration: `services/platform-api/src/app.module.ts`
- shared API-client contract update:
  - `packages/api-client/src/index.ts` adds `marketplaceApiRoutes.preview`
  - `createMarketplacePreviewRequest()` introduced for request reuse
- product-app read model and fallback:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - `/marketplace-preview` now loads read-only sections from API and falls back to local fixtures on failure
- focused validation:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - covers non-OK response fallback, thrown error fallback, invalid payload sanitization, and valid payload mapping

## 8. Second Minimal Docking Increment (Completed)

One richer read-model field was added without broadening scope:

- field added: `responseSlaHint` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid `responseSlaHint` values are dropped while preserving otherwise valid sections
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - response SLA hint rendered as read-only guidance text
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes valid mapping and invalid optional-field sanitization coverage

## 9. Third Minimal Docking Increment (Completed)

One additional trust/read-model field was added without widening scope:

- field added: `trustBadges` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional badge entries are filtered out while keeping valid values
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - trust badges render as read-only pills
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint` and `trustBadges`

## 10. Fourth Minimal Docking Increment (Completed)

One additional quality/read-model field was added without widening scope:

- field added: `readinessNote` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional readiness notes are dropped while preserving valid sections
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - readiness note rendered as read-only supporting copy
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization coverage for `responseSlaHint`, `trustBadges`, and `readinessNote`

## 11. Fifth Minimal Docking Increment (Completed)

One additional data-quality signal was added without widening scope:

- field added: `dataFreshnessMinutes` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional freshness values are dropped unless they are finite numbers
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - freshness is rendered as read-only supporting metadata (`Data freshness: ~X min`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint`, `trustBadges`, `readinessNote`, and `dataFreshnessMinutes`

## 12. Sixth Minimal Docking Increment (Completed)

One additional payload-confidence signal was added without widening scope:

- field added: `payloadCompletenessPercent` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional values are dropped unless they are finite numbers in range 0..100
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - confidence is rendered as read-only supporting metadata (`Payload completeness: X%`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint`, `trustBadges`, `readinessNote`, `dataFreshnessMinutes`, and `payloadCompletenessPercent`

## 13. Seventh Minimal Docking Increment (Completed)

One minimal cross-field derived indicator was added without widening scope:

- field added: `dataFreshnessLabel` (derived in product-app read model)
- derivation source:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from `dataFreshnessMinutes` with thresholds (`fresh` <= 5, `stable` <= 15, `stale` > 15)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - freshness metadata now includes the derived label (`Data freshness: ~X min (label)`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes derived label assertions (`fresh` and `stable`) plus existing optional-field sanitization checks

## 14. Eighth Minimal Docking Increment (Completed)

One minimal route-level aggregate indicator was added without widening scope:

- field added: `previewHealth` on marketplace preview result
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from per-section freshness/completeness signals
  - current policy:
    - `critical` if any section has payload completeness below 80
    - `watch` if stale freshness exists or average completeness drops below 90
    - `good` otherwise
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route now renders `Preview health: <level> · <summary>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes explicit health-level assertions (`good` and `critical`) in addition to existing sanitization/derivation checks

## 15. Ninth Minimal Docking Increment (Completed)

One tiny route-level visual severity treatment was added without widening scope:

- UI treatment added for `previewHealth.level`:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route-level health panel now varies border/text treatment for `good`, `watch`, and `critical`
  - includes stable test hooks (`marketplace-preview-health`, `marketplace-preview-health-level`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - added explicit `watch` health-level assertion while retaining `good` and `critical` coverage

## 16. Tenth Minimal Docking Increment (Completed)

One small section/route consistency signal was added without widening scope:

- field added: `sectionHealthLevel` on marketplace preview sections
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from the same freshness/completeness thresholds used by route-level preview health (`good`/`watch`/`critical`)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders `Section health: <level>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes explicit section-level `critical` and `watch` assertions and keeps `good` coverage in valid mapping checks

## 17. Eleventh Minimal Docking Increment (Completed)

One small route-level summary count was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - route-level preview health now includes section distribution counters:
    - `goodSections`
    - `watchSections`
    - `criticalSections`
- fallback alignment:
  - fallback sections now include consistent section-health defaults where appropriate
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route health panel now renders the section distribution summary
  - stable test hook added: `marketplace-preview-health-counts`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert section distribution counts

## 18. Twelfth Minimal Docking Increment (Completed)

One tiny data-coverage hint was added without widening scope:

- field added: `dataCoverageHint` on marketplace preview sections
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - computed from optional metadata presence count per section
  - emits small categorical hint copy (`well-covered` / `partially covered` / `minimal`)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders `Data coverage: <hint>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - validates both sparse and rich optional-field coverage hints in mapped sections

## 19. Thirteenth Minimal Docking Increment (Completed)

One tiny route-level data-coverage rollup was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - route-level preview health now includes coverage distribution counters:
    - `coverageWellSections`
    - `coveragePartialSections`
    - `coverageMinimalSections`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders coverage rollup summary via `marketplace-preview-coverage-counts`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical health tests now also assert coverage distribution counters

## 20. Fourteenth Minimal Docking Increment (Completed)

One tiny derived route-level narrative summary was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.narrative` derived from health level and coverage distribution
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders the narrative via `marketplace-preview-health-narrative`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert narrative intent markers

## 21. Fifteenth Minimal Docking Increment (Completed)

One tiny deterministic route-level severity token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.severityBadgeToken` derived deterministically from `previewHealth.level`
  - mapping: `good -> badge-good`, `watch -> badge-watch`, `critical -> badge-critical`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders severity badge token via `marketplace-preview-health-badge-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert the expected deterministic badge token

## 22. Sixteenth Minimal Docking Increment (Completed)

One tiny deterministic section-level severity token was added without widening scope:

- section enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `sectionSeverityBadgeToken` derived deterministically from `sectionHealthLevel`
  - mapping: `good -> badge-good`, `watch -> badge-watch`, `critical -> badge-critical`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders a stable badge token with test hook `marketplace-preview-section-badge-<section-id>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - mapping and watch/critical section cases now assert section badge tokens explicitly

## 23. Seventeenth Minimal Docking Increment (Completed)

One tiny route-level risk headline was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.riskHeadline` derived from section critical/watch counts
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders risk headline via `marketplace-preview-health-risk-headline`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert risk headline intent markers

## 24. Eighteenth Minimal Docking Increment (Completed)

One tiny deterministic route-level coverage band token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.coverageBandToken` derived deterministically from coverage counters
  - mapping: `minimal>0 -> coverage-low`, else `partial>0 -> coverage-medium`, else `coverage-high`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders coverage band token via `marketplace-preview-coverage-band-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests assert `coverage-medium`; rich metadata mapping test asserts `coverage-high`

## 25. Nineteenth Minimal Docking Increment (Completed)

One tiny deterministic section-level coverage band token was added without widening scope:

- section enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `dataCoverageBandToken` derived from section optional-metadata presence
  - mapping: `well-covered -> coverage-high`, `partially -> coverage-medium`, `minimal -> coverage-low`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders coverage band token via `marketplace-preview-section-coverage-<section-id>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - sparse, rich, watch, and critical section cases now assert deterministic section coverage band token behavior

## 26. Twentieth Minimal Docking Increment (Completed)

One tiny deterministic route-level alignment token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.alignmentToken` derived from severity + coverage signals
  - mapping:
    - risk conditions -> `align-risk`
    - mixed monitoring conditions -> `align-mixed`
    - stable healthy conditions -> `align-strong`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders alignment token via `marketplace-preview-alignment-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert alignment token behavior
  - rich metadata mapping test asserts `align-strong`

## 27. Twenty-First Minimal Docking Increment (Completed)

Two tiny deterministic parity signals were added without widening scope:

- section-level parity signal:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `sectionAlignmentToken` derived from section severity + section coverage tokens
  - mapping uses the same alignment policy used by route-level health (`align-risk` / `align-mixed` / `align-strong`)
- route-level compact status signal:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.statusDigest` as a deterministic normalized snapshot string
  - includes level/severity/coverage/alignment + section and coverage counters for compact demo/debug reads
- screen-level presentation updates:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders alignment token via `marketplace-preview-section-alignment-<section-id>`
  - health panel now renders status digest via `marketplace-preview-status-digest`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - added assertions for section alignment token mapping and deterministic status digest values in good/watch/critical flows

## 28. Updated Exact Next Docking Point

Continue with another minimal, low-risk increment that keeps the same constraints:

1. keep `/marketplace-preview` demo-safe and read-only
2. add one tiny deterministic section-route parity summary string in section card footer (human-readable + token-backed)
3. retain route/shell reuse (no new parallel navigation or platform split)
4. keep accessibility/testID instrumentation for every new interactive or state-bearing element
5. add one focused test per changed module before widening scope

## 29. Acceptance Criteria for the Next Contributor

- [ ] no deviation from shared product-app architecture
- [ ] no hidden expansion of scope beyond one read-only slice increment
- [ ] explicit fallback behavior for all new remote reads
- [ ] focused tests added and passing
- [ ] README handoff section kept in sync with actual implementation state

## 29. Phase-1 Thin Vertical Slice Foundation (Auth + Booking Transitions)

A minimal but real backend-backed slice is now in place for auth and booking transitions:

- platform-api refactor from controller literals to module/service structure:
  - `services/platform-api/src/auth/auth.module.ts`
  - `services/platform-api/src/auth/auth.service.ts`
  - `services/platform-api/src/auth/session-store.service.ts`
  - `services/platform-api/src/bookings/bookings.module.ts`
  - `services/platform-api/src/bookings/bookings.service.ts`
  - `services/platform-api/src/bookings/bookings.controller.ts`
- hardcoded auth fixture replaced with token-based in-memory sessions:
  - `GET /api/v1/auth/session` resolves bearer token into authenticated/anonymous state
  - `POST /api/v1/auth/sign-in` issues session token
  - `POST /api/v1/auth/sign-out` invalidates session token
- booking flow foundation implemented with server-side transition enforcement:
  - `POST /api/v1/bookings` (customer role only) creates booking in `submitted`
  - `POST /api/v1/bookings/:bookingId/accept` (provider role only) transitions `submitted -> accepted`
  - immutable in-memory `statusHistory` appended per transition event
- api-client contracts expanded for this slice:
  - sign-in/sign-out helpers
  - create booking + accept booking request builders
- product app minimal real action path wired:
  - sign-in CTA now calls platform-api sign-in endpoint
  - session bootstrap refresh uses bearer token and updates authenticated state in UI
  - focused tests added for token header propagation + sign-in/bootstrap happy path

This slice intentionally does **not** include payments, full onboarding orchestration, or persistence beyond in-memory state.

## 30. DB-ready Architecture Slice (Completed)

This pass moved backend architecture from pure in-memory wiring to DB-ready boundaries without changing controller/service contracts:

- persistence direction locked via ADR:
  - `docs/planning/10_ADR-Persistence-Path-Postgres-Redis-Object-Storage.md`
  - decision: PostgreSQL (PostGIS-ready) + Redis + object storage, no Supabase runtime dependency
  - deployment note: Vercel-hosted app surfaces remain valid with external DB/cache/storage
- repository interfaces introduced in domain modules:
  - auth: `src/auth/domain/auth-session.repository.ts`
  - bookings: `src/bookings/domain/booking.repository.ts`
- in-memory adapters remain default (drop-in for upcoming Postgres adapters):
  - auth: `src/auth/infrastructure/in-memory-auth-session.repository.ts`
  - bookings: `src/bookings/infrastructure/in-memory-booking.repository.ts`
- Nest DI now binds services to repository tokens (contracts unchanged at controller level):
  - `AuthService` consumes `AUTH_SESSION_REPOSITORY`
  - `BookingsService` consumes `BOOKING_REPOSITORY`
- initial SQL migration scaffolding added:
  - `services/platform-api/migrations/0001_initial_auth_bookings.sql`
  - `services/platform-api/migrations/README.md`
  - tables: `users`, `sessions`, `bookings`, `booking_status_history`
  - includes key constraints/indexes for current auth + booking transition behavior
- backend unit tests added:
  - `src/auth/auth.service.test.ts` (session resolution + sign-out invalidation)
  - `src/bookings/bookings.service.test.ts` (create/accept authorization and transition conflict checks)

### Updated exact next docking point

Implement the first real Postgres adapter behind existing repository interfaces, with no controller/service API changes:

1. add Postgres repository implementations for auth sessions and bookings
2. wire adapter selection via environment flag (`in-memory` default, `postgres` optional)
3. execute `0001` migration against a local Postgres instance and add a minimal adapter integration test slice
4. keep current in-memory tests green as fallback behavior

## 31. Concurrency + Session Lifecycle Hardening (Completed)

This pass closes the two next persistence hardening slices without widening controller contracts:

- booking accept concurrency/idempotency hardening:
  - retries from the **same provider** are now idempotent (`ok: true`) and return the already-accepted booking without extra history writes
  - competing providers still receive deterministic `transition-conflict`
  - conflict payload now includes `currentProviderUserId` in repository results for deterministic diagnostics
  - both adapters aligned:
    - `src/bookings/infrastructure/in-memory-booking.repository.ts`
    - `src/bookings/infrastructure/postgres-booking.repository.ts`
  - tests added/updated for replay + near-simultaneous attempts:
    - `src/bookings/bookings.service.test.ts`
    - `src/bookings/infrastructure/postgres-booking.repository.test.ts`
    - `src/persistence/postgres-mode.integration.test.ts`

- auth session lifecycle enforcement:
  - `AuthSession` now includes `expiresAt`
  - session TTL defaults to 12h (`AUTH_SESSION_TTL_SECONDS` override supported)
  - resolve now enforces expiry in both adapters
  - deterministic on-access invalidation implemented:
    - in-memory: remove expired token during resolve
    - postgres: delete expired token on resolve before active lookup
  - migration added:
    - `services/platform-api/migrations/0002_session_expiry_enforcement.sql`
    - enforces `sessions.expires_at` non-null + default + index
  - tests added/updated:
    - `src/auth/infrastructure/in-memory-auth-session.repository.test.ts`
    - `src/auth/infrastructure/postgres-auth-session.repository.test.ts`

### Updated exact next docking point

Proceed to Phase-2 orchestration while preserving the current API surface:

1. emit booking-accepted domain event after successful transition (including idempotent replay flag)
2. wire background worker consumer stub with retry visibility and deterministic logging envelope
3. add one end-to-end verification slice proving event emission + consumer handling path
4. keep repository contracts async and parity-tested across in-memory/postgres modes

## 32. Phase-2 Orchestration Kickoff + Observability Hardening (Completed)

This slice implements the first minimal orchestration handoff and correlation breadcrumbs without changing public response contracts.

- platform-api domain event emission from booking write path:
  - `BookingsService.acceptBooking` now emits a `booking.accepted` domain event after each successful accept (first accept and idempotent replay)
  - event envelope includes:
    - `eventName`, `eventId`, `occurredAt`
    - `correlationId`
    - `replayed`
    - accepted booking identity payload (`bookingId`, `customerUserId`, `providerUserId`, `requestedService`, `status`)
  - emission is routed via a dedicated publisher boundary:
    - `src/orchestration/domain-event.publisher.ts`
    - `src/orchestration/logging-domain-event.publisher.ts`
    - provider wired in `src/bookings/bookings.module.ts`

- background-workers consumer stub with retry visibility semantics:
  - added `consumeBookingAcceptedAttempt` in:
    - `services/background-workers/src/workers/booking-accepted.worker.ts`
  - structured status logging now makes retries explicit:
    - start: includes `attempt`, `maxAttempts`, `eventId`, `bookingId`, `replayed`
    - success: `processed`
    - failure with retries left: `retry-scheduled`
    - terminal failure: `dead-letter`
  - worker pipeline registry updated to include `booking-accepted-orchestration`

- correlation breadcrumb hardening (auth + booking write paths):
  - new correlation utility:
    - `services/platform-api/src/observability/correlation-id.ts`
  - behavior:
    - accepts sanitized client-provided `x-correlation-id`
    - falls back deterministically to `corr-<sha256-prefix>` derived from request method/path/token/body
  - write-path coverage:
    - `POST /api/v1/auth/sign-in`
    - `POST /api/v1/auth/sign-out`
    - `POST /api/v1/bookings`
    - `POST /api/v1/bookings/:bookingId/accept`
  - response header propagation:
    - `x-correlation-id` is echoed/generated for these write routes
  - structured logs now include correlation breadcrumbs across:
    - auth writes
    - booking writes
    - booking domain event emission
    - worker attempt processing

- tests added for this slice:
  - `services/platform-api/src/bookings/bookings.service.test.ts`
    - asserts domain event emission includes correlation id and replay flag behavior
  - `services/platform-api/src/observability/correlation-id.test.ts`
    - asserts header normalization and deterministic fallback generation

### Updated exact next docking point

1. add a minimal relay bridge (in-memory queue/outbox fixture) connecting emitted booking events to the worker consumer stub for one executable producer->consumer slice
2. add one focused integration test asserting correlation id continuity from booking accept write through relay into worker consume logs/results
3. keep API payload contracts unchanged; continue using structured logs and lightweight envelopes only
