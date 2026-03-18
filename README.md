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

## Current handoff point

- current focus: Phase 0 bootstrap is complete, `apps/product-app` consumes `packages/domain`, `packages/ui`, and `packages/auth`, and `packages/api-client` is now ready for direct workspace consumption
- smallest next step: add `@quickwerk/api-client` to `apps/product-app` or wire a matching minimal auth/session endpoint into `services/platform-api`
- follow-up after that: connect the first real sign-in/onboarding module to the shared API/auth/domain boundaries already in place
