# QuickWerk / Handwerker OnDemand

[![CI](https://github.com/MarkoAtc/QuickWerk/actions/workflows/ci.yml/badge.svg)](https://github.com/MarkoAtc/QuickWerk/actions/workflows/ci.yml)

QuickWerk is a cross-platform SME services marketplace: one shared product app for customers and providers, one web-first admin surface for operations, and a modular platform API behind both.

## Repository structure

- `apps/product-app` — Expo Router app shared across web, iOS, and Android
- `apps/admin-web` — Next.js admin/operator surface
- `services/platform-api` — NestJS backend for auth, bookings, providers, disputes, payouts, invoices, reviews, and operator tooling
- `services/background-workers` — async worker package used by relay/event flows
- `packages/domain` — shared domain types, lifecycle rules, and operator/dispute contracts
- `packages/api-client` — shared API route contracts and request helpers
- `packages/auth` — auth/session boundary constants and helpers
- `packages/ui` — shared UI primitives
- `packages/analytics` — analytics hooks/contracts
- `packages/localization` — localization scaffolding
- `packages/config` — shared config helpers
- `packages/test-utils` — shared testing utilities
- `infra/terraform` — infrastructure placeholder for future cloud baseline
- `docs/planning` — architecture, roadmap, and handoff docs
- `docs/ops` — operational runbooks and environment setup notes

## Platform direction

- cross-platform-first
- mobile-first in UX
- one shared product app codebase for web, iOS, and Android
- separate web-first admin/ops interface

## What is built

### Product app (`apps/product-app`)

Implemented routes/screens exist for:

- auth entry + sign-in
- home triage / post-auth entry
- marketplace preview
- public provider discovery
- provider detail + provider profile
- provider workspace / onboarding state
- booking wizard
- booking detail flow
- active job flow

The product app also has state/action modules and focused tests around auth bootstrap, discovery, provider flows, booking transitions, payouts, and review-related actions.

### Admin web (`apps/admin-web`)

Backend-facing operator state modules already exist for:

- provider verification queue loading/review transitions
- dispute queue loading and operator action transitions (`start-review`, `resolve`, `close`)

Today the rendered app shell is still minimal (`src/app/page.js`), so the queue logic exists before the real dashboard UI does.

### Platform API (`services/platform-api`)

Implemented controller surfaces include:

- `auth` — sign-in, sign-out, session resolution
- `bookings` — preview, list/detail, create, accept, decline, complete, payment lookup
- `providers` — public discovery, provider verification submit/status/review, provider profile upsert/read
- `disputes` — booking dispute submission plus operator dispute queue/actions
- `payouts`
- `invoices`
- `reviews`
- `operators/relay-queue`
- `health` / readiness

The backend also includes persistence-mode switching, relay execution/orchestration, and focused test coverage across the main lifecycle modules.

### Shared packages

- `@quickwerk/domain` centralizes shared records and workflow rules
- `@quickwerk/api-client` keeps app/backend route contracts aligned
- `@quickwerk/auth` holds shared auth/session boundaries
- the remaining workspace packages support UI, analytics, config, localization, and test reuse

## Current state

### Product-facing surfaces

The user-facing app now resolves auth session bootstrap, marketplace preview, provider discovery, and provider profile/detail from platform API contracts by default. Fallback fixtures remain only for true request failures and some non-critical UX paths still contain placeholder actions while backend docking continues.

### Backend and operator logic

The platform API and shared domain packages carry the strongest implementation depth right now: auth/session handling, booking lifecycle endpoints, provider verification workflows, dispute operations, and relay/operator infrastructure are implemented as backend modules with tests. The biggest remaining presentation gap is the admin-web dashboard rendering layer, not the underlying provider/dispute queue logic.

## Ops docs

- Platform API env/setup commands: `docs/ops/platform-api-env.md`
- Relay queue phase history + operator infra notes: `docs/infra/relay-queue.md`
- Relay queue degradation runbook: `docs/ops/relay-queue-runbook.md`

## Phase history

Booking/product phases and relay-infra phases diverged over time. The relay queue implementation history now lives in `docs/infra/relay-queue.md` so the root README can stay focused on current repo state.
