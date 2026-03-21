# ADR 10 — Persistence Path (Postgres + Redis + Object Storage)

## Status
Accepted (2026-03-20)

## Context
QuickWerk currently runs auth sessions and booking transitions in memory for thin-slice velocity. We need a DB-ready path that keeps contracts stable while staying deploy-compatible across AWS and Vercel-hosted app surfaces.

## Decision
1. **Primary database**: PostgreSQL (PostGIS-ready)
   - canonical transactional source for users, sessions, bookings, and booking status history
   - PostGIS extension is not mandatory on day one, but schema and adapter choices must remain PostGIS-compatible
2. **Cache/ephemeral state**: Redis
   - short-lived session/cache/rate-limit workloads
3. **Binary/object data**: S3-compatible object storage
   - documents/photos/attachments and similar payloads are stored out of Postgres rows
4. **No Supabase runtime dependency**
   - Supabase may be used as a local/dev convenience only if needed, but production architecture must not depend on Supabase-specific services
5. **Deployment compatibility**
   - product/admin app can remain on Vercel
   - `platform-api` can run on container/server runtime with external PostgreSQL/Redis/object storage
   - if API surface is later partially serverless, DB and Redis remain external managed services
6. **Query/ORM layer recommendation**: **Drizzle ORM + SQL-first migrations**
   - practical fit for TypeScript monorepo and explicit SQL control
   - low abstraction overhead and straightforward escape-hatch to raw SQL (important for PostGIS and transition-sensitive updates)
   - keeps schema typing in-code while preserving plain SQL migration history

## Consequences
- repository interfaces must isolate auth/booking domain contracts from persistence details (in-memory now, Postgres adapter later)
- SQL migrations are maintained as first-class artifacts in `services/platform-api/migrations`
- next persistence slice should add a concrete Postgres adapter behind the new repository interfaces without changing controller/service contracts
