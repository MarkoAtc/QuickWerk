# Plan — draft-qw-core-vslice

## Issue
Issue draft needed (see `.agent/plans/issue-draft-qw-core-vslice.md`)

## Branch
`feature/qw-core-prime-audit-plan-exec`

## Plan file path
`.agent/plans/draft-qw-core-vslice-implementation-plan.md`

## Goal (restated)
Move QuickWerk from demo-read-only trajectory to real MVP execution by implementing a production-oriented thin vertical slice (auth + provider eligibility + booking create/accept + audited state transitions), while preserving existing architecture boundaries.

## Constraints
- Keep changes slice-based and test-backed
- Avoid broad visual polish-only increments
- Preserve shared package boundaries and monorepo conventions

## Phase 0 — Foundation hardening (execution now)
1. Prime/Audit artifacts committed and linked in docs
2. Introduce backend module boundaries for auth/booking/provider domains
3. Add minimal persistence-ready contracts (repository interfaces + transition policy)
4. Add security baseline increment (request IDs + centralized validation boundaries)

## Phase 1 — Real vertical slice (execute immediately after Phase 0)
1. Real session resolution endpoint (`/api/v1/auth/session`)
2. Booking create endpoint (customer)
3. Booking accept endpoint (eligible provider)
4. Immutable booking status history and transition guards
5. Product app docking: replace one preview flow with real endpoint data

## Phase 2 — Orchestration
1. Async event on booking acceptance
2. Worker consumer for notification stub with retry visibility
3. Minimal ops logging for traceability

## Verification commands
- `corepack pnpm --filter @quickwerk/product-app test`
- `corepack pnpm check`
- `corepack pnpm --filter @quickwerk/platform-api typecheck`

## Risks to control
- Demo drift (non-functional polish)
- Contract drift between frontend and backend
- Missing persistence/transition correctness

## Execution order for next 1–2 days
1. Implement auth/session service (no fixture literals)
2. Implement booking transition policy + endpoints
3. Dock product app to new API path for one real thin flow
4. Validate and document in `docs/planning/08_Implementation-Handoff-and-Docking-Guide.md`
