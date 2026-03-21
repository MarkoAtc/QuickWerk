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

## 11. Fifth Minimal Docking Increment (Completed)

One additional data-quality signal was added without widening scope:

- field added: `dataFreshnessMinutes` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional freshness values are dropped unless they are finite numbers
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - freshness is rendered as read-only supporting metadata (`Data freshness: ~X min`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint`, `trustBadges`, `readinessNote`, and `dataFreshnessMinutes`

## 12. Sixth Minimal Docking Increment (Completed)

One additional payload-confidence signal was added without widening scope:

- field added: `payloadCompletenessPercent` on marketplace preview sections
- backend payload update:
  - `services/platform-api/src/marketplace/marketplace.controller.ts`
- product-app read-model update and sanitization:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - invalid optional values are dropped unless they are finite numbers in range 0..100
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - confidence is rendered as read-only supporting metadata (`Payload completeness: X%`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes optional-field sanitization for `responseSlaHint`, `trustBadges`, `readinessNote`, `dataFreshnessMinutes`, and `payloadCompletenessPercent`

## 13. Seventh Minimal Docking Increment (Completed)

One minimal cross-field derived indicator was added without widening scope:

- field added: `dataFreshnessLabel` (derived in product-app read model)
- derivation source:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from `dataFreshnessMinutes` with thresholds (`fresh` <= 5, `stable` <= 15, `stale` > 15)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - freshness metadata now includes the derived label (`Data freshness: ~X min (label)`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes derived label assertions (`fresh` and `stable`) plus existing optional-field sanitization checks

## 14. Eighth Minimal Docking Increment (Completed)

One minimal route-level aggregate indicator was added without widening scope:

- field added: `previewHealth` on marketplace preview result
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from per-section freshness/completeness signals
  - current policy:
    - `critical` if any section has payload completeness below 80
    - `watch` if stale freshness exists or average completeness drops below 90
    - `good` otherwise
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route now renders `Preview health: <level> · <summary>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes explicit health-level assertions (`good` and `critical`) in addition to existing sanitization/derivation checks

## 15. Ninth Minimal Docking Increment (Completed)

One tiny route-level visual severity treatment was added without widening scope:

- UI treatment added for `previewHealth.level`:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route-level health panel now varies border/text treatment for `good`, `watch`, and `critical`
  - includes stable test hooks (`marketplace-preview-health`, `marketplace-preview-health-level`)
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - added explicit `watch` health-level assertion while retaining `good` and `critical` coverage

## 16. Tenth Minimal Docking Increment (Completed)

One small section/route consistency signal was added without widening scope:

- field added: `sectionHealthLevel` on marketplace preview sections
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - derived from the same freshness/completeness thresholds used by route-level preview health (`good`/`watch`/`critical`)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders `Section health: <level>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - includes explicit section-level `critical` and `watch` assertions and keeps `good` coverage in valid mapping checks

## 17. Eleventh Minimal Docking Increment (Completed)

One small route-level summary count was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - route-level preview health now includes section distribution counters:
    - `goodSections`
    - `watchSections`
    - `criticalSections`
- fallback alignment:
  - fallback sections now include consistent section-health defaults where appropriate
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - route health panel now renders the section distribution summary
  - stable test hook added: `marketplace-preview-health-counts`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert section distribution counts

## 18. Twelfth Minimal Docking Increment (Completed)

One tiny data-coverage hint was added without widening scope:

- field added: `dataCoverageHint` on marketplace preview sections
- derivation and logic:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - computed from optional metadata presence count per section
  - emits small categorical hint copy (`well-covered` / `partially covered` / `minimal`)
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders `Data coverage: <hint>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - validates both sparse and rich optional-field coverage hints in mapped sections

## 19. Thirteenth Minimal Docking Increment (Completed)

One tiny route-level data-coverage rollup was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - route-level preview health now includes coverage distribution counters:
    - `coverageWellSections`
    - `coveragePartialSections`
    - `coverageMinimalSections`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders coverage rollup summary via `marketplace-preview-coverage-counts`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical health tests now also assert coverage distribution counters

## 20. Fourteenth Minimal Docking Increment (Completed)

One tiny derived route-level narrative summary was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.narrative` derived from health level and coverage distribution
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders the narrative via `marketplace-preview-health-narrative`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert narrative intent markers

## 21. Fifteenth Minimal Docking Increment (Completed)

One tiny deterministic route-level severity token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.severityBadgeToken` derived deterministically from `previewHealth.level`
  - mapping: `good -> badge-good`, `watch -> badge-watch`, `critical -> badge-critical`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders severity badge token via `marketplace-preview-health-badge-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert the expected deterministic badge token

## 22. Sixteenth Minimal Docking Increment (Completed)

One tiny deterministic section-level severity token was added without widening scope:

- section enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `sectionSeverityBadgeToken` derived deterministically from `sectionHealthLevel`
  - mapping: `good -> badge-good`, `watch -> badge-watch`, `critical -> badge-critical`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders a stable badge token with test hook `marketplace-preview-section-badge-<section-id>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - mapping and watch/critical section cases now assert section badge tokens explicitly

## 23. Seventeenth Minimal Docking Increment (Completed)

One tiny route-level risk headline was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.riskHeadline` derived from section critical/watch counts
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders risk headline via `marketplace-preview-health-risk-headline`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert risk headline intent markers

## 24. Eighteenth Minimal Docking Increment (Completed)

One tiny deterministic route-level coverage band token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.coverageBandToken` derived deterministically from coverage counters
  - mapping: `minimal>0 -> coverage-low`, else `partial>0 -> coverage-medium`, else `coverage-high`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders coverage band token via `marketplace-preview-coverage-band-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests assert `coverage-medium`; rich metadata mapping test asserts `coverage-high`

## 25. Nineteenth Minimal Docking Increment (Completed)

One tiny deterministic section-level coverage band token was added without widening scope:

- section enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `dataCoverageBandToken` derived from section optional-metadata presence
  - mapping: `well-covered -> coverage-high`, `partially -> coverage-medium`, `minimal -> coverage-low`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders coverage band token via `marketplace-preview-section-coverage-<section-id>`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - sparse, rich, watch, and critical section cases now assert deterministic section coverage band token behavior

## 26. Twentieth Minimal Docking Increment (Completed)

One tiny deterministic route-level alignment token was added without widening scope:

- preview health enrichment:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.alignmentToken` derived from severity + coverage signals
  - mapping:
    - risk conditions -> `align-risk`
    - mixed monitoring conditions -> `align-mixed`
    - stable healthy conditions -> `align-strong`
- screen-level presentation update:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - health panel now renders alignment token via `marketplace-preview-alignment-token`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - good/watch/critical tests now assert alignment token behavior
  - rich metadata mapping test asserts `align-strong`

## 27. Twenty-First Minimal Docking Increment (Completed)

Two tiny deterministic parity signals were added without widening scope:

- section-level parity signal:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `sectionAlignmentToken` derived from section severity + section coverage tokens
  - mapping uses the same alignment policy used by route-level health (`align-risk` / `align-mixed` / `align-strong`)
- route-level compact status signal:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.ts`
  - added `previewHealth.statusDigest` as a deterministic normalized snapshot string
  - includes level/severity/coverage/alignment + section and coverage counters for compact demo/debug reads
- screen-level presentation updates:
  - `apps/product-app/src/features/marketplace/marketplace-preview-screen.js`
  - each section now renders alignment token via `marketplace-preview-section-alignment-<section-id>`
  - health panel now renders status digest via `marketplace-preview-status-digest`
- focused tests expanded:
  - `apps/product-app/src/features/marketplace/marketplace-preview-data.test.ts`
  - added assertions for section alignment token mapping and deterministic status digest values in good/watch/critical flows

## 28. Updated Exact Next Docking Point

Continue with another minimal, low-risk increment that keeps the same constraints:

1. keep `/marketplace-preview` demo-safe and read-only
2. add one tiny deterministic section-route parity summary string in section card footer (human-readable + token-backed)
3. retain route/shell reuse (no new parallel navigation or platform split)
4. keep accessibility/testID instrumentation for every new interactive or state-bearing element
5. add one focused test per changed module before widening scope

## 29. Acceptance Criteria for the Next Contributor

- [ ] no deviation from shared product-app architecture
- [ ] no hidden expansion of scope beyond one read-only slice increment
- [ ] explicit fallback behavior for all new remote reads
- [ ] focused tests added and passing
- [ ] README handoff section kept in sync with actual implementation state
