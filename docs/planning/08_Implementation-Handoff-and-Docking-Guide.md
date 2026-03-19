# Handwerker OnDemand Implementation Handoff and Docking Guide

## 1. Purpose

This document records the exact implementation sequence completed in the latest development pass so any engineer or AI assistant can quickly understand what changed, why it changed, how it was validated, and where to continue safely.

## 2. Baseline Before This Pass

- monorepo and package boundaries were already established
- shared product app had route-level home and auth entry surfaces (`/` and `/auth`)
- auth/session bootstrap endpoint existed in `services/platform-api`
- local auth entry stubs and state derivation existed in `apps/product-app`
- focused state tests existed for `auth-entry-state`
- planning docs declared a temporary UI-first meeting detour and an immediate engineering return task for session-bootstrap fallback test coverage

## 3. What Was Implemented in This Pass

## 3.1 Temporary UI-first detour completion

A single post-auth preview slice was added in the shared product app without changing architecture boundaries:

- added route file: `apps/product-app/app/marketplace-preview.js`
- added feature screen: `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
- preserved existing composition style by reusing:
  - `ProductScreenShell`
  - `ProductRouteLink`
- added navigation entry points:
  - home (`apps/product-app/app/index.js`) now links to `/marketplace-preview`
  - auth entry (`apps/product-app/src/features/auth/auth-entry-screen.js`) now links to `/marketplace-preview` only when auth state resolves to continuation (`continue-to-marketplace`)

## 3.2 Engineering return track completion

Focused session-bootstrap fallback coverage was added:

- new test file: `apps/product-app/src/shared/session-bootstrap.test.ts`
- covered cases:
  - HTTP non-OK response returns fallback with explicit error message
  - thrown fetch error returns fallback with propagated message
  - invalid bootstrap payload values are sanitized to safe defaults while keeping `source: platform-api` for successful transport

## 4. Scope Controls Maintained

## In scope and preserved

- shared `apps/product-app` path
- Expo Router route wiring
- local demo fixtures and preview copy
- disabled/no-op CTA placeholders
- accessibility and testID patterns

## Out of scope and still untouched

- `apps/admin-web`
- persistent backend writes
- payment or production auth expansion
- package boundary restructuring
- cross-platform architecture changes

## 5. Validation Evidence

Commands run from repository root:

- `pnpm check`
- `pnpm --filter @quickwerk/product-app test`

Observed result:

- workspace typecheck passed
- product-app tests passed

## 6. Current Technical Position

The project now has:

- a demonstrable post-auth meeting-safe route in the shared app
- explicit and test-covered session-bootstrap fallback behavior
- unchanged long-term architecture direction

## 7. First Read-only API Docking Slice (Completed)

The recommended first follow-up slice has now been implemented in the same style:

- new platform API endpoint: `GET /api/v1/bookings/preview`
  - file: `services/platform-api/src/marketplace/marketplace.controller.ts`
  - registration: `services/platform-api/src/app.module.ts`
- shared API-client contract update:
  - `packages/api-client/src/index.ts` adds `marketplaceApiRoutes.preview`
  - `createMarketplacePreviewRequest()` introduced for request reuse
- product-app read model and fallback:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - `/marketplace-preview` now loads read-only sections from API and falls back to local fixtures on failure
- focused validation:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - covers non-OK response fallback, thrown error fallback, invalid payload sanitization, and valid payload mapping

## 8. Second Minimal Docking Increment (Completed)

One richer read-model field was added without broadening scope:

- field added: `responseSlaHint` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid `responseSlaHint` values are dropped while preserving otherwise valid sections
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - response SLA hint rendered as read-only guidance text
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes valid mapping and invalid optional-field sanitization coverage

## 9. Third Minimal Docking Increment (Completed)

One additional trust/read-model field was added without widening scope:

- field added: `trustBadges` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional badge entries are filtered out while keeping valid values
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - trust badges render as read-only pills
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint` and `trustBadges`

## 10. Fourth Minimal Docking Increment (Completed)

One additional quality/read-model field was added without widening scope:

- field added: `readinessNote` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional readiness notes are dropped while preserving valid sections
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - readiness note rendered as read-only supporting copy
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization coverage for `responseSlaHint`, `trustBadges`, and `readinessNote`

## 11. Updated Exact Next Docking Point

Continue with another minimal, low-risk increment that keeps the same constraints:

1. keep `/marketplace-preview` demo-safe and read-only
2. add exactly one small data-quality signal per section (not a broad section expansion)
3. retain route/shell reuse (no new parallel navigation or platform split)
4. keep accessibility/testID instrumentation for every new interactive or state-bearing element
5. add one focused test per changed module before widening scope

## 12. Acceptance Criteria for the Next Contributor

- [ ] no deviation from shared product-app architecture
- [ ] no hidden expansion of scope beyond one read-only slice increment
- [ ] explicit fallback behavior for all new remote reads
- [ ] focused tests added and passing
- [ ] README handoff section kept in sync with actual implementation state
