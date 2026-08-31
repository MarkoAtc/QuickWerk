# Plan — #67 Provider onboarding and profile responsiveness

## Issue and scope

- **Issue:** [#67](https://github.com/MarkoAtc/QuickWerk/issues/67)
- **Parent:** Refs #55
- **Branch:** `codex/fix/67-provider-onboarding-profile-responsive`
- **Scope:** `/provider-onboarding` and the existing provider-profile presentation only. Provider workspace, payouts, admin, messenger, backend, and contracts are excluded.

## Acceptance criteria

- [x] Both surfaces are usable without horizontal overflow at 320, 360, 390, 430, and 1024 px.
- [x] Phone onboarding stacks form/readiness content and save/submit actions; wide layouts retain their intended columns.
- [x] Phone provider profiles stack identity and content, wrap chips/reviews, and keep the booking CTA reachable; wide layouts retain their intended row composition.
- [x] Existing onboarding actions, profile loading/error states, and booking/navigation behavior are unchanged.

## Risk / TDD classification

`risky-logic`: first add failing pure responsive-policy tests, then make the policy and screens GREEN. Presentation changes must not alter API, auth, payment, privacy, persistence, or route-parameter contracts.

## Validation Contract

### Assertions

- [x] A pure provider-layout policy selects phone-safe gutters, typography, stacked columns/actions at 320–430 px and the intentional wide composition at 1024 px.
- [x] Onboarding and profile presentation consume that policy without changing existing callbacks or route handoffs.
- [x] Existing provider action/state regression tests still pass.
- [x] Product tests, workspace type-check, Expo web export, and CI-equivalent validation pass.

### Performance bounds

`N/A —` layout resolution is pure, constant-time, and adds no I/O, timers, polling, listeners, or network requests.

### Interface contracts

`N/A —` no backend, API-client, domain, auth, authorization, payment, privacy, persistence, or route-parameter contract changes are permitted.

## Implementation slices

1. Add `provider-layout` with RED/GREEN tests for required widths.
2. Apply it to provider onboarding hero, pills, two-column content, fields, and action group.
3. Apply it to provider profile hero, cards/reviews, and CTA; correct the route/component import only if required to preserve existing behavior.
4. Run focused and CI-equivalent checks plus browser QA; write execution report and fresh review.

## Browser QA

At `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900`, verify no horizontal overflow (`scrollWidth <= clientWidth`), no console/page errors, vertical scrolling, and reachable primary actions. Cover onboarding empty/partial/complete form states and profile loading/error/long-content states.

## Commands

```sh
pnpm --filter @quickwerk/product-app exec vitest run src/shared/provider-layout.test.js src/features/provider/onboarding-screen-actions.test.ts src/features/provider/provider-profile-state.test.ts src/features/provider/provider-screen-actions.test.ts src/features/provider/provider-screen-actions-profile.test.ts
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-67-provider-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: focused policy/action/state tests (55 assertions), product-app tests (341 assertions), workspace type-check, Expo web export, CI-equivalent tests/builds, and browser QA at all required widths passed. RED evidence: the focused policy suite initially failed because `provider-layout` did not exist; it passed after implementation.
- Remaining gaps: persisted execution report, fresh review, commit, PR, CI, and CodeRabbit review.
- Next action: persist execution evidence and complete the review/commit boundary.
