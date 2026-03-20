# QuickWerk / Handwerker OnDemand

This repository is now initialized for **Phase 0** of the agreed implementation plan.

## Current foundation

- `apps/product-app` — shared product app shell for web, iOS, and Android
- `apps/admin-web` — separate web-first admin and operations surface
- `services/platform-api` — modular backend service foundation
- `services/background-workers` — async worker foundation
- `packages/*` — shared packages for UI, domain, API client, auth, analytics, localization, config, and test utilities
- `infra/terraform` — infrastructure placeholder for the future cloud baseline


## Platform direction

- cross-platform-first
- mobile-first in UX
- one shared product-app codebase for web, iOS, and Android
- separate web-first admin/ops interface

## Notes

- Phase 0 bootstrap is now runnable and type-safe at a basic level.
- Root workspace tooling is installed with `pnpm` + `turbo`.
- `apps/product-app` has a minimal Expo Router shell for web, iOS, and Android.
- `apps/admin-web` has a minimal Next.js app-router shell.
- `services/platform-api` has a minimal NestJS HTTP bootstrap with `GET /health` returning `200 OK`.
- `services/background-workers` has a minimal runnable worker bootstrap with build/start scripts.
- `packages/domain` now contains the first shared provider-onboarding slice consumed by `apps/product-app`.
- `packages/auth` is now exposed as a real shared workspace package with initial auth/session boundary constants.
- `apps/product-app` now consumes `packages/auth` through a real workspace dependency for shared session/auth-flow state.
- `packages/api-client` is now exposed as a real shared workspace package with initial auth/session API route contracts.
- `services/platform-api` now exposes a minimal `GET /api/v1/auth/session` bootstrap endpoint for the auth/session boundary.
- `apps/product-app` now consumes `packages/api-client` and surfaces the shared auth/session request contract in the cross-platform shell.
- `apps/product-app` now performs a minimal runtime session bootstrap against the shared auth/session boundary with a safe local fallback state.
- `apps/product-app` now exposes a small auth-focused session-bootstrap state module that drives the first sign-in/onboarding-aware home-screen state.
- `apps/product-app` now renders that auth entry state through a tiny dedicated auth/onboarding section component instead of keeping the readout inline in `app/index.js`.
- `apps/product-app` now resolves its platform API base URL from runtime environment variables (`EXPO_PUBLIC_PLATFORM_API_BASE_URL`, `_WEB`, `_NATIVE`) before falling back to the local bootstrap URL.
- `apps/product-app` now presents tiny disabled primary/secondary auth action affordances in the auth entry section, ready for later navigation wiring without changing the current flow.
- `apps/product-app` now wires those auth affordances to a tiny local action-state preview so sign-in/sign-up/reset selections update in-place without introducing a full auth flow.
- `apps/product-app` now swaps that preview into tiny action-specific auth screen stubs so each local sign-in/sign-up/reset state has its own minimal shared surface.
- `apps/product-app` now exposes those auth stubs through a dedicated `/auth` route, so `app/index.js` becomes a lightweight product home entry instead of the only auth surface.
- `apps/product-app` now uses a tiny shared screen shell for the home and auth routes, keeping top-level layout concerns consistent without changing local auth behavior.
- `apps/product-app` now also uses a tiny shared route-link component for home/auth navigation affordances, reducing repeated inline button markup without changing routing.
- `apps/product-app` now gives that shared route-link component explicit accessibility label/hint support for clearer cross-platform navigation affordances.
- `apps/product-app` now exposes stable `testID` hooks on the auth action switcher and action panel, so future UI verification can target those surfaces without reshaping the component tree.
- `apps/product-app` now also exposes selected/disabled accessibility state on the auth action controls, making the local auth switcher clearer for assistive technologies.
- `apps/product-app` now also exposes stable `testID` hooks on the shared home/auth route links, so future navigation checks can target those affordances directly.
- `apps/product-app` now also exposes stable `testID` hooks on the shared home/auth screen shells, so future route-level checks can target the current top-level surface directly.
- `apps/product-app` now also exposes stable `testID` hooks on the auth-entry status/helper text outputs, so future checks can assert local bootstrap state without relying on copied strings alone.
- `apps/product-app` now has a lightweight Vitest setup with a `test` script and focused unit coverage for the loading, anonymous, and authenticated branches of `src/features/auth/auth-entry-state.ts`.

## Current handoff point

- current focus: continue from the completed temporary UI-first detour and resume the auth/session hardening track without changing agreed architecture boundaries

## Temporary UI-first meeting detour (implemented)

- what was implemented: one shared post-auth preview route inside `apps/product-app` at `/marketplace-preview`, using the existing route/shell/auth-entry direction as the base
- why this was done: create visible progress for the customer meeting without introducing a parallel architecture or misleading delivery priorities
- exact implemented scope: one presentation-focused route/screen showing post-auth marketplace/onboarding continuation with local preview cards/sections
- implementation details:
  - new route: `apps/product-app/app/marketplace-preview.js`
  - new screen module: `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route wiring reuse: `ProductScreenShell` + `ProductRouteLink`
  - navigation entry points:
    - home route (`app/index.js`) now links to `/marketplace-preview`
    - auth route (`auth-entry-screen.js`) now links to `/marketplace-preview` when the session state resolves to authenticated continuation
- explicitly in scope (kept): shared `apps/product-app`, Expo Router route wiring, existing shared screen shell/route-link components, local demo fixtures, preview copy, and disabled CTA placeholders
- explicitly out of scope (kept): `apps/admin-web`, real backend wiring, persistent data, production auth expansion, package boundary changes, and broad feature work beyond the single demo slice
- demo-safe / stub-only guarantee maintained: local mocked content, placeholder state labels, non-functional CTA actions, no write-side backend behavior

## Engineering return track (implemented next)

- completed return-point task: added focused fallback-behavior coverage for `apps/product-app/src/shared/session-bootstrap.ts`
- test file: `apps/product-app/src/shared/session-bootstrap.test.ts`
- added coverage:
  - non-OK HTTP response fallback with explicit error message
  - thrown fetch error fallback with propagated error message
  - invalid payload sanitization for session state, next step, and available action routes

## First read-only API docking slice (implemented)

- goal achieved: `/marketplace-preview` now supports one read-only API-backed preview load with explicit fallback to local fixtures
- platform API additions:
  - new endpoint: `GET /api/v1/bookings/preview`
  - file: `services/platform-api/src/marketplace/marketplace.controller.ts`
  - module registration updated in `services/platform-api/src/app.module.ts`
- shared API contract additions:
  - `packages/api-client/src/index.ts` now exposes `marketplaceApiRoutes.preview` and `createMarketplacePreviewRequest()`
- product-app additions:
  - new data loader: `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - route screen now loads preview sections from API and falls back safely: `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - new focused tests: `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`

## Verification snapshot

- `pnpm check` passes across workspace packages
- `pnpm --filter @quickwerk/product-app test` passes (`auth-entry-state`, `session-bootstrap`, and `marketplace-preview-data`)

## Persistence mode handoff (current)

`services/platform-api` now runs real auth + booking persistence in either mode with retry-safe booking accept semantics and enforced session expiry:

- `PERSISTENCE_MODE=in-memory|postgres`
- default remains `in-memory`
- mode/config resolution: `services/platform-api/src/persistence/persistence-mode.ts`
- DI selection remains centralized in module providers for auth + bookings

### What is now implemented in both adapters

- async repository contracts for auth + bookings (Promise-based)
- booking accept idempotency/retry safety:
  - first provider accept transitions `submitted -> accepted`
  - retry by the **same provider** returns `ok: true` without duplicate history events
  - competing provider accept returns deterministic transition conflict
  - near-simultaneous attempts are covered by tests
- auth session lifecycle enforcement:
  - sessions now always carry `expiresAt`
  - resolve path enforces expiry in both adapters
  - on-access cleanup invalidates expired sessions deterministically

### Postgres-specific notes

- migration `0002_session_expiry_enforcement.sql` now enforces `sessions.expires_at` (`NOT NULL`, default `NOW() + 12h`, indexed)
- `PostgresAuthSessionRepository` creates sessions with DB-side TTL via `make_interval`
- `PostgresBookingRepository` keeps `FOR UPDATE` locking and now supports same-provider accept replay semantics

### Required env vars

```bash
PERSISTENCE_MODE=postgres
DATABASE_URL=postgres://<user>:<pass>@<host>:5432/<db>
# optional override (seconds), defaults to 43200 (12h)
AUTH_SESSION_TTL_SECONDS=43200

# optional: enable durable relay transport path
BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent
```

### Run commands

From repo root:

```bash
# apply schema + expiry enforcement
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0001_initial_auth_bookings.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0002_session_expiry_enforcement.sql

# apply durable relay transport table (needed for postgres-persistent relay mode)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0003_booking_accepted_relay_attempts.sql

# run platform API tests + typecheck
corepack pnpm --filter @quickwerk/platform-api test
corepack pnpm --filter @quickwerk/platform-api typecheck

# optional real DB integration test (gated)
RUN_POSTGRES_INTEGRATION_TESTS=1 DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @quickwerk/platform-api test
```

### Phase-2 relay slice + correlation continuity (completed)

- lightweight producer→consumer relay path (in-memory, no queue infra):
  - platform-api now uses `RelayBookingDomainEventPublisher` for `booking.accepted` emission
  - relay invokes `consumeBookingAcceptedAttempt` from `@quickwerk/background-workers` directly
  - public API response payloads are unchanged (correlation response header behavior remains the same)
- worker envelope contract hardening:
  - `@quickwerk/domain` now defines `BookingAcceptedWorkerEnvelope`
  - deterministic retry/backoff metadata fields are included:
    - `strategy: deterministic-exponential-v1`
    - `attempt`, `maxAttempts`, `backoffMs`, `nextAttemptAt`
  - terminal DLQ marker schema added (stub-level only):
    - `terminal: true`, `queueName: booking.accepted.dlq`, `reason: max-attempts-exhausted`, `markedAt`
- correlation continuity proof:
  - focused integration test added in platform-api:
    - `src/bookings/booking-accept-relay.integration.test.ts`
  - verifies booking accept request both with and without `x-correlation-id`
  - asserts same correlation id across:
    - booking accept request/response
    - emitted `booking.accepted` domain event log
    - background worker consume attempt log
    - relay result details (`workerCorrelationId`)

### Phase-2 failure/terminal relay hardening (completed)

- retry progression coverage is now end-to-end in relay execution (still in-memory):
  - relay now performs deterministic retry handoff attempts up to `maxAttempts=3` when failures are simulated
  - each relay attempt emits a structured breadcrumb (`booking.accepted.domain-event.relay.attempt`) with retry metadata and worker status
  - deterministic backoff progression is now covered through tests for attempt sequence `1 -> 2 -> 3` with `1000ms -> 2000ms -> 4000ms`
- terminal-path DLQ propagation proof is now integrated:
  - exhausted retries produce `workerStatus: dead-letter`
  - final relay details now include the worker DLQ marker (`queueName`, `reason`, `terminal`, `markedAt`)
- targeted tests added:
  - `services/background-workers/src/workers/booking-accepted.worker.test.ts`
    - backoff progression assertions for attempts 2/3
    - terminal DLQ marker assertions on exhausted attempt
  - `services/platform-api/src/bookings/booking-accept-relay.integration.test.ts`
    - retry progression integration path (`attempt 2..N`) with deterministic backoff checks
    - terminal exhausted path asserting `dead-letter` + DLQ marker propagation

### Phase-2 relay policy + fixed-clock seams (completed)

- relay failure simulation is now seam-driven instead of env-driven hacks:
  - introduced `BookingAcceptedRelayAttemptPolicy` with DI token `BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY`
  - default runtime policy is `NoopBookingAcceptedRelayAttemptPolicy` (keeps normal in-memory success path unchanged)
  - tests now inject attempt policies directly (`createFailUntilAttemptPolicy`) to drive retry/dead-letter scenarios deterministically
- deterministic clock seam introduced for relay retry timing:
  - introduced `BookingAcceptedRelayClock` with DI token `BOOKING_ACCEPTED_RELAY_CLOCK`
  - default runtime clock is `SystemBookingAcceptedRelayClock`
  - relay now passes injected clock instants into worker attempts (`now`) so retry `nextAttemptAt` is test-deterministic
- targeted integration coverage expanded:
  - `services/platform-api/src/bookings/booking-accept-relay.integration.test.ts`
  - new fixed-clock boundary test asserts exact `nextAttemptAt` values across attempts
  - existing retry/dead-letter tests no longer depend on process env toggles

### Phase-2 persistent relay transport (Postgres) + provider mode hardening (completed)

- relay attempt execution remains behind `RelayAttemptExecutor`, now with:
  - `InMemoryRelayAttemptExecutor` (default, safe behavior)
  - `PostgresRelayAttemptExecutor` (durable transport path)
- persistent mode is explicitly opt-in via env:
  - `BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent`
  - runtime guard: persistent mode requires `PERSISTENCE_MODE=postgres`
  - default remains `in-memory`
  - backwards alias `queue-backed` now maps to `postgres-persistent` to avoid config breakage during migration
- durable relay transport schema added:
  - migration: `services/platform-api/migrations/0003_booking_accepted_relay_attempts.sql`
  - tracks status (`queued|processed|retry-scheduled|dead-letter`), attempt/max-attempts, `next_attempt_at`, `correlation_id`, payload snapshot, retry snapshot, DLQ snapshot, terminal marker
- enqueue/process semantics in persistent path:
  - each attempt writes a queued row first, then finalizes the same row with worker outcome and retry/DLQ metadata
  - duplicate enqueue calls are idempotent (`ON CONFLICT DO NOTHING`) and resolve to persisted outcome snapshots
  - correlation id continuity is preserved from domain event through worker result and persisted row snapshots
- durable dequeue + retry loop semantics added:
  - executor now drains due retry rows (`status=retry-scheduled`, `next_attempt_at <= now`) in bounded batches per call
  - due-row claiming uses `FOR UPDATE SKIP LOCKED` + successor-attempt existence guard to avoid duplicate progression under concurrency
  - claimed due rows materialize the next attempt row (`attempt + 1`) and process it through the same finalization path (`processed|retry-scheduled|dead-letter`)
- restart-safe reclaim semantics:
  - if an attempt row already exists in `queued` state (e.g., crash between enqueue and finalize), later execute calls reclaim and finalize that row deterministically
  - due retry rows are only advanced when no successor attempt row exists, making resume behavior deterministic after restarts
- minimal queue observability breadcrumbs:
  - emits `booking.accepted.domain-event.relay.queue.observability` with `depth`, `dueCount`, `deadLetterCount`, and `processingLagMs`
- compatibility guardrails preserved:
  - existing `booking.accepted.domain-event.relay.attempt` and `booking.accepted.domain-event.relay` structured-log contract tests remain unchanged and green
  - publisher orchestration and public API payloads are unchanged
- focused tests added/updated:
  - `relay-attempt-executor.provider.test.ts` covers persistent mode selection + postgres guardrail
  - `relay-attempt-executor.postgres.test.ts` now also covers lock-safe due dequeue progression and correlation continuity for derived retry attempts

### Exact next docking point

1. move retry drain from request-coupled execute path into dedicated background worker tick (same claim SQL, bounded batch) so HTTP latency is decoupled from queue catch-up
2. expose queue metrics via health/readiness endpoint surface (not only breadcrumbs) and add alert thresholds for sustained lag/dead-letter growth
3. add multi-instance concurrency integration test against real Postgres to validate claim fairness and no-double-advance guarantees under parallel executors
