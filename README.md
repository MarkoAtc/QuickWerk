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

- current focus: take a short-term, presentation-focused UI detour for tomorrow's customer meeting by building one visible demo-safe slice inside the existing shared `apps/product-app`, without changing the agreed architecture or long-term roadmap

## Temporary UI-first meeting detour

- what we are switching to right now: build one shared post-auth preview slice inside `apps/product-app`, using the existing route/shell/auth-entry direction as the base
- why we are doing it: create visible progress for the customer meeting without introducing a parallel architecture or misleading the team about delivery priorities
- exact scope: one new presentation-focused route/screen in the shared product app, likely showing a post-auth marketplace/onboarding continuation with local preview cards/sections
- explicitly in scope: shared `apps/product-app`, Expo Router route wiring, existing shared screen shell/route-link components, local demo fixtures, preview copy, and disabled or no-op CTA placeholders
- explicitly out of scope: `apps/admin-web`, real backend wiring, persistent data, production auth expansion, package boundary changes, or broad new feature work beyond the single demo slice
- demo-safe / stub-only: local mocked data, placeholder state, preview labels, non-functional CTA actions, and any content needed only to present the intended cross-platform UX
- structurally important work not being skipped: shared package boundaries, one shared product-app codebase for web/iOS/Android, current auth/session bootstrap direction, Expo Router route structure, accessibility/testability hardening, and focused unit testing
- exact handoff point for continuing the UI-first demo slice: add one route-level preview screen in `apps/product-app` that represents the next step after auth, keep it clearly marked as preview/demo-safe, and reuse the existing shared shell and route-link primitives rather than inventing new structure
- exact return point after the meeting: resume the pending engineering path with one focused test for `apps/product-app/src/shared/session-bootstrap.ts` fallback behavior, then continue the auth/session hardening track from there
- follow-up after returning: if needed, add one small UI-focused test around the auth-entry screen once a minimal React Native-compatible render path is chosen
