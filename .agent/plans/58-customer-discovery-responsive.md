# Issue #58 — Customer discovery route responsiveness

## Issue

[#58 — Audit and repair customer discovery route responsiveness](https://github.com/MarkoAtc/QuickWerk/issues/58)

Parent roadmap: [#55 — Complete mobile-first responsiveness and remaining UI migration](https://github.com/MarkoAtc/QuickWerk/issues/55)

## Goal

Inventory and repair the authenticated customer marketplace discovery path at the established phone viewport matrix. Reuse the responsive baseline shipped in #56 while preserving current address/category/provider parameters, discovery loading and fallback behavior, provider-detail error handling, and navigation into booking.

## Execution contract

- **Branch:** `codex/fix/58-customer-discovery-responsive`
- **Plan:** `.agent/plans/58-customer-discovery-responsive.md`
- **Classification:** `risky-logic` — viewport branching changes rendered composition across a live customer route group, and its state/action/navigation behavior must remain stable.
- **RED proof:** focused tests fail because the customer-discovery layout policy does not exist; the tests must describe phone/compact/wide decisions for grid columns, hero/stat composition, provider-card composition, bounded spacing/type, and invalid-width fallback before implementation.
- **GREEN proof:** the new layout-policy tests, existing responsive/discovery/provider-detail tests, product suite, workspace typecheck, Expo export, full CI-equivalent checks, and browser matrix all pass.

## Route-group inventory

| Route | Current behavior to preserve | Responsive concern to repair |
|---|---|---|
| `/home-triage` | Address editing; category, discovery, and booking navigation | Header/address wrapping, search and chip rail, map overlays, SOS control, match-card rail, bottom-editor reachability |
| `/categories` | Address propagation and category selection into booking | Fixed two-column percentage grid, header wrapping, search field, promo-card spacing |
| `/discovery` | Debounced filters; loading/error/empty/live states; curated fallback; provider navigation | 54px hero type, three-stat row, wide provider-card header/footer rows, large fixed card padding |
| `/provider-detail` | Loading/error/not-found handling; reviews; back navigation; booking CTA | Fixed avatar/title row, 42px title, wide content-card padding, stat/CTA reachability |

### Explicitly deferred route groups

- Booking and payment: `/booking-wizard`, `/booking`, `/checkout`.
- Active/post-job: `/active-job`, `/booking-completion`, `/review`.
- Provider experience: `/provider`, `/provider-onboarding`, `/provider-profile`, `/payouts`.
- Secondary/public surfaces: `/marketplace-preview`, `/messenger`, `/sign-in`, and any future route not listed above.
- Admin web remains a separate desktop design-parity phase.

## Acceptance criteria

- [x] The four routes are documented and delivered as one bounded customer discovery group; deferred route groups remain explicit rather than implied.
- [x] All four routes reuse `resolveResponsiveLayout` / `useResponsiveLayout`; no parallel breakpoint system or new dependency is introduced.
- [x] `/home-triage` keeps intentional horizontal chip and match-card rails while the page itself has no horizontal overflow; the location control, search/category affordance, SOS action, cards, and address editor remain readable and reachable.
- [x] `/categories` adapts its grid before tile labels, descriptions, header controls, search, or promo content become cramped or clipped.
- [x] `/discovery` uses bounded phone typography and collapses hero stats and provider-card header/footer rows before copy or actions become unreadable.
- [x] `/provider-detail` adapts its identity header and content-card spacing at phone widths; stat pills wrap and the booking CTA remains reachable.
- [x] Loading, error, empty, live-data, curated-fallback, review-empty, and long-content states remain vertically scrollable and usable where applicable.
- [x] Address/category/location/provider parameters, the 400ms discovery debounce, live-versus-curated fallback behavior, provider-detail missing/not-found handling, and navigation into `/booking-wizard` remain unchanged.
- [x] Focused RED/GREEN tests cover the route-group layout policy; existing responsive, discovery, and provider-detail state/action tests remain green.
- [x] Browser QA at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900` shows zero page-level horizontal overflow, clipped primary controls, unreadable wrapping, or inaccessible primary actions.
- [x] Product tests, workspace typecheck, Expo web export, and all repository CI-equivalent checks pass.
- [x] Validation, review, execution, loop-checkpoint, and parent-roadmap evidence are persisted through the ADOS delivery loop.

## Likely touch points

### Existing files

- `apps/product-app/app/home-triage.js`
- `apps/product-app/src/shared/responsive-layout.js` only if a neutral shared value is genuinely missing
- `apps/product-app/src/shared/responsive-layout.test.js` only for shared-contract extensions
- `apps/product-app/src/shared/use-responsive-layout.js` (reuse; no duplicate dimension subscription)
- `apps/product-app/src/features/marketplace/home-triage-screen.js`
- `apps/product-app/src/features/marketplace/service-categories-screen.js`
- `apps/product-app/src/features/discovery/discovery-screen.js`
- `apps/product-app/src/features/discovery/provider-detail-screen.js`
- `apps/product-app/src/features/discovery/discovery-screen-state.test.ts`
- `apps/product-app/src/features/discovery/provider-discovery-actions.test.ts`
- `apps/product-app/src/features/discovery/provider-detail-state.test.ts`
- `apps/product-app/src/features/discovery/provider-detail-actions.test.ts`
- `docs/planning/13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`

### Expected new files

- `apps/product-app/src/shared/customer-discovery-layout.js`
- `apps/product-app/src/shared/customer-discovery-layout.test.js`
- `.agent/reports/loops/58-core-delivery-loop/checkpoint.md`
- `.agent/reports/validation/58-customer-discovery-responsive.md`
- `.agent/reports/code-reviews/58-customer-discovery-responsive.md`
- `.agent/reports/execution-reports/58-customer-discovery-responsive.md`

The executor may choose a more narrowly named feature-local layout policy if source inspection shows a cleaner ownership boundary, but it must remain pure, testable, and built on the #56 responsive classification rather than defining new breakpoints.

## Existing patterns to follow

- Use `resolveResponsiveLayout` for deterministic width classification and `useResponsiveLayout` for React Native window updates.
- Keep route files focused on navigation and state orchestration; keep layout decisions in a pure helper and screen presentation components.
- Preserve action/state modules and shared API request builders; this is a UI/responsive slice.
- Keep horizontal rails intentional and locally scrollable; document-level overflow remains a failure.
- Use `.claude/skills/browser-drive` for the established Expo-web browser matrix unless that environment is unavailable, and record any fallback.

## Validation Contract

### Assertions (written before implementation)

- [x] Widths `320`, `360`, `390`, and `430` resolve to phone-safe customer-discovery decisions with bounded gutter, card padding, hero/title size, and single-column or stacked compositions where required.
- [x] Intermediate widths use compact decisions, and `1024` uses an intentional wide presentation without changing route behavior.
- [x] Non-finite, missing, zero, and negative widths fail closed through the existing phone-safe responsive classification.
- [x] Category layout never relies on a fixed `48.8%` two-column tile width at phone widths; tile text and controls remain readable.
- [x] Discovery hero stats stack at phone widths; provider identity/rating and footer copy/action compositions wrap or stack before collision.
- [x] Provider-detail identity content adapts at phone widths; long provider names, service areas, trade chips, reviews, and the primary CTA remain readable and reachable.
- [x] Home-triage intentionally scrolls chip/match rails without creating document overflow; location editing and primary entry actions remain usable at 320px.
- [x] Discovery loading, error, empty, live-results, curated-fallback, and long-provider-content states preserve their existing data semantics.
- [x] Provider-detail loading, missing-id, not-found, request-error, loaded, and no-review states preserve their existing semantics.
- [x] Home category selection still sends `category` and `address` to `/booking-wizard`; browsing sends `location` to `/discovery`; category selection forwards `address`; discovery sends `providerUserId` to `/provider-detail`; provider detail sends `providerUserId` and the first trade category to `/booking-wizard`.
- [x] The discovery debounce remains `400ms`, stale-request protection remains intact, and no additional network request is introduced by responsive rendering.
- [x] Existing responsive-layout, discovery-state/action, and provider-detail-state/action tests pass unchanged unless an assertion is deliberately strengthened without changing behavior.
- [x] `pnpm --filter @quickwerk/product-app test` passes with zero failures.
- [x] `pnpm check` passes with zero errors.
- [x] Expo web export resolves every modified route and import.
- [x] Browser QA at the required five viewports reports `scrollWidth <= clientWidth`, no console/page errors, and accessible primary controls for every in-scope route and required state.
- [x] All CI-equivalent tests and builds pass.

### Performance bounds

- Responsive layout resolution remains constant-time pure arithmetic with no I/O, polling, timers, list traversal proportional to provider count, or manual resize listener.
- The existing discovery filter debounce remains `400ms`; responsive changes add zero provider API requests and do not weaken stale-request suppression.
- Existing horizontal rails and provider lists render the same bounded static/live records; no unbounded duplicated list is introduced.

### Interface contracts

- No backend, API-client, authentication, authorization, payment, persistence, matching, or data-retention contract changes.
- `HomeTriage({ address, onSelectCategory, onChangeAddress, onBrowseProviders, onOpenCategories })` remains compatible.
- `ServiceCategories({ onSelectCategory, onBack })` remains compatible.
- `DiscoveryScreen({ initialTradeCategory, initialLocation })` remains compatible.
- `ProviderDetailScreen()` continues to resolve `providerUserId` from Expo Router and keeps the current loading/error/loaded state contract.
- Route names and parameters remain unchanged: `category`, `address`, `location`, and `providerUserId` retain their current meanings.
- `loadPublicProviders` and `loadProviderDetail` request/response handling remains unchanged.
- The responsive policy remains product-app-local and introduces no new package-level public API or dependency.

## Implementation plan

1. **Record the baseline and RED proof.** Capture the four-route inventory and add failing focused tests for the customer-discovery layout policy at phone, compact, wide, and invalid widths. Record the failure as the missing-policy RED checkpoint.
2. **Add the pure route-group layout policy.** Build it on `resolveResponsiveLayout`, returning only presentation decisions shared by these screens. Reuse `useResponsiveLayout` in rendered components and avoid another breakpoint table or dimension listener.
3. **Repair home and category entry.** Make the home header, map overlays, controls, intentional rails, SOS action, and bottom address editor phone-safe. Make the category header/grid/search/promo composition adapt without changing navigation or address propagation.
4. **Repair discovery states and cards.** Bound hero/section typography and padding, stack hero stats, adapt provider identity/rating/footer composition, and confirm loading/error/empty/live/curated states remain readable and semantically unchanged.
5. **Repair provider detail.** Adapt identity layout, card padding/type, stat pills, review content, error surfaces, and booking CTA while preserving provider loading and navigation contracts.
6. **Update route inventory documentation.** Mark this route group and its exclusions in the canonical migration plan; update the #58 loop checkpoint and leave later #55 slices explicitly open.
7. **Run focused and full verification.** Capture RED/GREEN results, run the product suite, workspace typecheck, Expo export, the full CI-equivalent command set, `git diff --check`, and browser QA across the viewport/state matrix. Persist results in the validation report; keep disposable screenshots outside the repository and record their paths.
8. **Run review and delivery gates.** Perform a fresh diff review, resolve actionable findings, persist code-review/execution evidence, commit atomically, open a PR referencing #55 and fixing #58, then follow `.agent/workflows/review-pr.md` until CI is green and no actionable feedback remains. Leave the PR open for human merge.

## Browser QA matrix

| Route/state | Required interactions and observations |
|---|---|
| `/home-triage` default | Location label, search/categories, chip rail, SOS, and match rail are reachable; intentional rails scroll without document overflow |
| `/home-triage` address editor | Long address wraps/truncates intentionally, input remains reachable with the on-screen keyboard model, and Cancel/Save remain visible or vertically reachable |
| `/categories` | Header controls, long category labels/descriptions, search field, every tile, and promo card remain readable; select one category and verify forwarded params |
| `/discovery` loading/error/empty | Spinner, retry/clear actions, filter fields, and explanatory copy remain readable and reachable |
| `/discovery` live/curated/long content | Stats, long provider names/categories/service areas/tags, rating, and `View provider` action adapt without collision |
| `/provider-detail` loading/error | Loading copy and back action remain usable at phone widths |
| `/provider-detail` loaded/no reviews | Long identity/service-area content, stat pills, sections, empty reviews, and booking CTA remain readable and reachable |

For each matrix row record viewport, `scrollWidth`, `clientWidth`, console/page errors, interaction result, and screenshot path. Use `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900` for the applicable normal states; exercise at least `320x640` and `1024x900` for secondary/error/long-content states when reproducing every state at all widths would add no new signal.

## Edge cases and failure handling

- Long locations, provider names, trade-category strings, service areas, tags, bios, and review text must wrap without hiding actions.
- Safe-area and virtual-keyboard pressure must not make the address editor's Save/Cancel actions unreachable.
- Absolute map markers may remain clipped to the intentional map canvas, but must not expand document width or cover primary controls.
- Horizontal category/match rails may overflow their own scroll container only; body/document overflow is a failure.
- Rapid discovery filter changes retain the current stale-request guard and debounce behavior.
- Empty live results continue to expose the curated showcase; request errors remain distinguishable from an empty list.
- Missing or unknown provider IDs keep the current explicit error surface and back navigation.
- Missing reviews and trade categories render safely without inventing backend data.
- Viewport changes during a session recompute presentation without resetting form/filter state or triggering data reloads.

## Rollback

Frontend, tests, and planning/report documentation only. Reverting the route-group policy, screen composition changes, tests, and documentation restores the previous layout. No database, API, auth, payment, or deployment rollback is required.

## Verification commands

```sh
pnpm --filter @quickwerk/product-app exec vitest run src/shared/customer-discovery-layout.test.js src/shared/responsive-layout.test.js src/features/discovery/discovery-screen-state.test.ts src/features/discovery/provider-discovery-actions.test.ts src/features/discovery/provider-detail-state.test.ts src/features/discovery/provider-detail-actions.test.ts
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-58-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
git diff --check
```

The repository has no lint command. Focused browser QA is required in addition to these commands.

## Gate Result

- Gate: Review
- Status: PASS
- Evidence: every acceptance and validation assertion above is backed by focused RED/GREEN evidence, full local validation, a 32-check browser/interaction contract, and a fresh diff review.
- Remaining gaps: remote PR CI and CodeRabbit review.
- Next action: commit atomically, open the issue-linked PR, and run `.agent/workflows/review-pr.md` until the remote gate is green.
