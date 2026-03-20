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

## Exact next docking point

- continue auth/session hardening and marketplace read models in small slices without widening scope
- latest increments completed:
  - added one richer read-model field (`responseSlaHint`) to marketplace preview sections from platform API, with sanitization + fallback in product-app
  - added one additional trust field (`trustBadges`) with optional-field sanitization and read-only UI rendering
  - added one quality/readiness field (`readinessNote`) with optional-field sanitization and read-only UI rendering
  - added one tiny data-quality signal (`dataFreshnessMinutes`) with numeric sanitization and read-only UI rendering
  - added one payload confidence signal (`payloadCompletenessPercent`) with range sanitization (0-100) and read-only UI rendering
  - added one cross-field derived indicator (`dataFreshnessLabel`) derived from `dataFreshnessMinutes` and rendered read-only
  - added one minimal route-level aggregate indicator (`previewHealth`) derived from section freshness/completeness signals
  - added one tiny route-level visual severity treatment for preview health (`good`/`watch`/`critical` styling)
  - added one small consistency signal (`sectionHealthLevel`) derived per section to align section-level and route-level status language
  - added one small route-level summary count for section health distribution (`good/watch/critical`)
  - added one tiny data-coverage hint (`dataCoverageHint`) when optional fields are sparse on a section
  - added one tiny route-level rollup over section coverage hints (`coverageWell/Partial/Minimal` counters)
  - added one tiny derived route-level narrative summary (`previewHealth.narrative`) combining health + coverage signals
  - added one tiny deterministic severity badge token (`previewHealth.severityBadgeToken`) derived from health level for stable snapshot/UI checks
  - added one tiny deterministic section badge token (`sectionSeverityBadgeToken`) derived from `sectionHealthLevel` for section-level visual consistency checks
  - added one tiny route-level risk headline (`previewHealth.riskHeadline`) derived from critical/watch counts
  - added one tiny deterministic route-level coverage band token (`previewHealth.coverageBandToken`) derived from coverage counters
  - added one tiny deterministic section coverage band token (`dataCoverageBandToken`) for section-level coverage consistency checks
  - added one tiny route-level alignment token (`previewHealth.alignmentToken`) derived from severity+coverage tokens for deterministic snapshot baselines
  - added one tiny deterministic section-level alignment token (`sectionAlignmentToken`) derived from section severity+coverage tokens for section parity checks
  - added one tiny normalized route-level status digest (`previewHealth.statusDigest`) for deterministic compact demo/debug snapshots
  - design polish pass for client demos: improved visual hierarchy, cleaner health panel, metadata pills, refined cards, and less noisy fallback messaging on `/marketplace-preview`
  - auth route polish pass for client demos: cleaner hero/status card, improved action pills, and refined auth panel card layout on `/auth`
- recommended next increment:
  - keep `/marketplace-preview` demo-safe and read-only, and add one tiny deterministic section-route parity summary string (per section card footer)
  - keep route/shell reuse intact; do not fork platform-specific structure
  - preserve testability pattern (`testID`, accessibility states, focused unit tests) before broadening surface area
- follow-up after this increment: add one minimal UI-focused test path for auth-entry/marketplace-preview interaction once a React Native-compatible render harness is selected
