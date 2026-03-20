# platform-api SQL migrations

This folder contains plain SQL migration scaffolding for the upcoming PostgreSQL adapter.

## Current migration set

- `0001_initial_auth_bookings.sql`
  - creates `users`, `sessions`, `bookings`, and `booking_status_history`
  - adds role/status constraints and transition-safety checks
  - adds indexes for current auth resolution and booking transition paths
- `0002_session_expiry_enforcement.sql`
  - enforces a non-null `sessions.expires_at` policy
  - backfills existing null expiries to `created_at + 12h`
  - adds default TTL (`NOW() + 12h`) and expiry index for cleanup/query efficiency

## How to run later (manual)

From repository root, point `DATABASE_URL` to the target PostgreSQL database and run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0001_initial_auth_bookings.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f services/platform-api/migrations/0002_session_expiry_enforcement.sql
```

Rollback is currently manual (early scaffold phase).
When we add a migration runner (Drizzle/Flyway/etc.), this folder remains the source of truth for SQL history.
