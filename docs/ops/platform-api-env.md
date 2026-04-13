# Platform API Environment + Run Commands

This document pulls the active environment reference and setup commands out of the root `README.md`.

## Persistence mode handoff

`services/platform-api` supports real auth + booking persistence in either mode with retry-safe booking accept semantics and enforced session expiry.

- `PERSISTENCE_MODE=in-memory|postgres`
- default remains `in-memory`
- mode/config resolution lives in `services/platform-api/src/persistence/persistence-mode.ts`
- DI selection remains centralized in module providers for auth + bookings

## What is implemented in both adapters

- async repository contracts for auth + bookings (Promise-based)
- booking accept idempotency / retry safety:
  - first provider accept transitions `submitted -> accepted`
  - retry by the same provider returns `ok: true` without duplicate history events
  - competing provider accept returns deterministic transition conflict
  - near-simultaneous attempts are covered by tests
- auth session lifecycle enforcement:
  - sessions always carry `expiresAt`
  - resolve path enforces expiry in both adapters
  - on-access cleanup invalidates expired sessions deterministically

## Postgres-specific notes

- migration `0002_session_expiry_enforcement.sql` enforces `sessions.expires_at` (`NOT NULL`, default `NOW() + 12h`, indexed)
- `PostgresAuthSessionRepository` creates sessions with DB-side TTL via `make_interval`
- `PostgresBookingRepository` keeps `FOR UPDATE` locking and supports same-provider accept replay semantics

## Required environment variables

```bash
PERSISTENCE_MODE=postgres
DATABASE_URL=postgres://<user>:***@<host>:5432/<db>
# optional override (seconds), defaults to 43200 (12h)
AUTH_SESSION_TTL_SECONDS=***

# optional: enable durable relay transport path
BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent

# optional: tune readiness watch/critical thresholds (defaults shown)
BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS=15000
BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS=60000
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT=10
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT=50
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT=1
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT=5
```

## Run commands

From repo root:

```bash
# apply schema + expiry enforcement
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0001_initial_auth_bookings.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0002_session_expiry_enforcement.sql

# apply durable relay transport table (needed for postgres-persistent relay mode)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0003_booking_accepted_relay_attempts.sql

# apply snapshot storage and operator-role migrations
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0004_booking_accepted_relay_queue_snapshots.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0005_operator_role_support.sql

# run platform API tests + typecheck
corepack pnpm --filter @quickwerk/platform-api test
corepack pnpm --filter @quickwerk/platform-api typecheck

# optional real DB integration test (gated)
RUN_POSTGRES_INTEGRATION_TESTS=1 DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @quickwerk/platform-api test
```