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

## 7. Exact Next Docking Point

Continue with a minimal, low-risk increment that keeps the same style and constraints:

1. keep `/marketplace-preview` as demo-safe shell
2. replace exactly one local preview section with read-only API data behind explicit fallback behavior
3. retain route/shell reuse (no new parallel navigation or platform split)
4. keep accessibility/testID instrumentation for every new interactive or state-bearing element
5. add one focused test per changed module before widening scope

## 8. Suggested First Follow-up Slice

- module target: `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
- backend touchpoint candidate: lightweight read-only endpoint in `services/platform-api`
- risk control: preserve local fallback rendering when API is unavailable
- validation: one targeted unit test for data sanitization/state mapping plus existing workspace typecheck

## 9. Acceptance Criteria for the Next Contributor

- [ ] no deviation from shared product-app architecture
- [ ] no hidden expansion of scope beyond one read-only slice
- [ ] explicit fallback behavior for all new remote reads
- [ ] focused tests added and passing
- [ ] README handoff section kept in sync with actual implementation state
