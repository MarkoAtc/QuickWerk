# Relay Queue Implementation History

This document captures the internal relay-infrastructure progression that used to live in the root `README.md`.

Scope:
- booking accepted domain-event relay path
- persistent relay queue transport and operator tooling
- queue observability / readiness / CSV export handoff

Operational runbook:
- `docs/ops/relay-queue-runbook.md`

## Phase-2 relay slice + correlation continuity

Completed:

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

## Phase-2 failure/terminal relay hardening

Completed:

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

## Phase-2 relay policy + fixed-clock seams

Completed:

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

## Phase-2 persistent relay transport (Postgres) + provider mode hardening

Completed:

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
- durable dequeue + retry loop semantics are now worker-tick driven:
  - HTTP request-path `execute(...)` no longer drains due retries
  - dedicated worker tick path (`RelayQueueWorkerService`) drains due retry rows in bounded batches
  - due-row claiming still uses `FOR UPDATE SKIP LOCKED` + successor-attempt existence guard to avoid duplicate progression under concurrency
  - claimed due rows materialize the next attempt row (`attempt + 1`) and process it through the same finalization path (`processed|retry-scheduled|dead-letter`)
- restart-safe reclaim semantics:
  - if an attempt row already exists in `queued` state (e.g., crash between enqueue and finalize), later execute calls reclaim and finalize that row deterministically
  - due retry rows are only advanced when no successor attempt row exists, making resume behavior deterministic after restarts
- minimal queue observability breadcrumbs:
  - emits `booking.accepted.domain-event.relay.queue.observability` with `depth`, `dueCount`, `deadLetterCount`, and `processingLagMs`
- readiness endpoint queue metrics surfaced:
  - new `GET /health/readiness` reports relay queue counters (`depth`, `dueCount`, `deadLetterCount`) and `lagMs`
  - includes threshold guidance and derived readiness level (`good|watch|critical`) for operational triage
  - existing `GET /health` payload remains unchanged
- compatibility guardrails preserved:
  - existing `booking.accepted.domain-event.relay.attempt` and `booking.accepted.domain-event.relay` structured-log contract tests remain unchanged and green
  - publisher orchestration and public API payloads are unchanged
- focused tests added/updated:
  - `relay-attempt-executor.provider.test.ts` covers persistent mode selection + postgres guardrail
  - `relay-attempt-executor.postgres.test.ts` covers lock-safe due dequeue progression via dedicated tick path and correlation continuity
  - `relay-attempt-executor.postgres-contention.integration.test.ts` (optional real-Postgres) proves multi-executor contention safety with no double-advance
  - `health.controller.test.ts` freezes readiness counters/lag + threshold-level mapping while preserving legacy `/health` payload

## Phase-3 operator guardrails + durable snapshots + dashboard/smoke handoff

Completed:

- operator authN/authZ guardrails added for `/operators/relay-queue/*`:
  - default mode requires bearer session auth
  - default allowed role set is `provider`
  - optional backward-compatible bypass remains available
  - unauthorized requests return `401`, non-operator roles return `403`
- queue metrics snapshots are now persisted durably in Postgres:
  - new migration: `services/platform-api/migrations/0004_booking_accepted_relay_queue_snapshots.sql`
  - new table: `booking_accepted_relay_queue_snapshots`
  - `/operators/relay-queue/snapshots` now reads paginated history from Postgres (`durability: postgres-table`)
  - bounded retention cleanup on insert via `BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION` (default `200`)
- dashboard-facing examples and smoke checks added:
  - runbook extended with Grafana/Alertmanager field mapping examples: `docs/ops/relay-queue-runbook.md`
  - operator endpoint smoke check script: `scripts/smoke/operator-relay-queue-smoke.sh`
- focused coverage added/updated:
  - `services/platform-api/src/operators/relay-queue.controller.test.ts` (auth guardrails + endpoint behavior)
  - `services/platform-api/src/orchestration/relay-attempt-executor.postgres.test.ts` (durable snapshot retention)
- existing public contracts remain stable:
  - legacy `GET /health` payload unchanged
  - relay structured-log contract tests remain unchanged

## Phase-4 operator role migration + SLO windows + bounded CSV export

Completed:

- dedicated `operator` session role shipped with backward-safe migration:
  - auth role model now supports `customer | provider | operator`
  - new migration: `services/platform-api/migrations/0005_operator_role_support.sql`
  - operator access defaults to transition mode (`operator + provider`) and can be tightened later:
    - `BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE=operator-provider-transition|operator-strict`
    - explicit role override remains available via `BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES`
- readiness/operator SLO window surfacing added for relay queue pressure:
  - `/health/readiness` now includes `relayQueue.sloWindow` (rolling-state occupancy summary)
  - `/operators/relay-queue/snapshots` now includes `relayQueue.current.sloWindow`
  - lightweight SLO env knobs:
    - `BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES`
    - `BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT`
    - `BOOKING_ACCEPTED_RELAY_SLO_WATCH_THRESHOLD_PERCENT`
    - `BOOKING_ACCEPTED_RELAY_SLO_CRITICAL_THRESHOLD_PERCENT`
- bounded read-only CSV export for operator dead-letter inspection:
  - new endpoint: `GET /operators/relay-queue/attempts.csv`
  - auth-guarded with same operator policy as JSON endpoints
  - defaults to dead-letter rows only, bounded limit, and allow-listed safe fields
- focused coverage added/updated:
  - `operator-access-policy.test.ts` (transition vs strict role behavior)
  - `health.controller.test.ts` + `readiness-thresholds.test.ts` (SLO window summary behavior)
  - `relay-queue.controller.test.ts` (CSV bounds/security + SLO payload)
- compatibility preserved:
  - legacy `GET /health` payload unchanged
  - existing relay structured-log contract tests unchanged and still green

## Phase-5 operator rollout telemetry + async CSV handoff + SLO trend buckets

Completed:

- operator-auth rollout telemetry added for relay operator endpoints:
  - role-mode usage counters and denied-role counters are tracked in-memory and surfaced as additive payload (`relayQueue.operatorAuthTelemetry`)
  - structured breadcrumbs emitted per access decision via `booking.accepted.relay.operator.access.telemetry`
  - strict/transition rollout visibility is available without changing existing endpoint contracts
- non-blocking CSV/export handoff path added for larger windows:
  - `GET /operators/relay-queue/attempts.csv/handoff` creates bounded async export jobs (up to `2000` rows)
  - `GET /operators/relay-queue/attempts.csv/handoff/:handoffId` polls job state
  - `GET /operators/relay-queue/attempts.csv/handoff/:handoffId?download=1` downloads CSV once ready
  - existing `GET /operators/relay-queue/attempts.csv` behavior remains unchanged
- pre-aggregated relay SLO trend buckets added for dashboard efficiency:
  - `/operators/relay-queue/snapshots` now includes `relayQueue.current.sloTrend`
  - bucket width configurable via `BOOKING_ACCEPTED_RELAY_SLO_TREND_BUCKET_MINUTES` (default `5`, max `60`)
- focused coverage added/updated:
  - `relay-queue.controller.test.ts` (telemetry counters, async handoff path, SLO trend payload shape)
  - `readiness-thresholds.test.ts` (bucketed trend builder)

## Exact next docking point

1. persist async CSV handoff jobs across restarts/replicas (DB-backed handoff state) while keeping auth scope unchanged
2. add lightweight per-endpoint latency counters to pair operator auth telemetry with performance trendlines
3. add dashboard endpoint presets for common incident windows (`15m`, `1h`, `6h`) using existing SLO trend buckets
