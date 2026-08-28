# Issue #56 — Mobile layout baseline and critical auth responsiveness

## Issue

[#56 — Establish mobile layout baseline and repair critical auth entry routes](https://github.com/MarkoAtc/QuickWerk/issues/56)

Parent roadmap: [#55 — Complete mobile-first responsiveness and remaining UI migration](https://github.com/MarkoAtc/QuickWerk/issues/55)

## Goal

Introduce a deterministic responsive-layout baseline for the Expo product app, reconcile the UI redesign roadmap with shipped and remaining work, and repair the customer phone/OTP and provider credential entry surfaces at phone widths without changing authentication behavior.

## Execution contract

- **Branch:** `codex/fix/56-mobile-auth-responsive`
- **Plan:** `.agent/plans/56-mobile-auth-responsive.md`
- **Classification:** `risky-logic` — viewport classification changes rendered composition, and auth role/request behavior must remain stable.
- **RED proof:** focused responsive-layout tests fail because the resolver and contract do not exist.
- **GREEN proof:** the resolver tests, existing role/request contract tests, product suite, typecheck, Expo export, and focused browser QA all pass.

## Acceptance criteria

- [x] The canonical UI redesign plan records shipped phases, the inserted responsiveness milestone, the remaining phase order, and the bounded route-slice model.
- [x] A reusable helper deterministically classifies phone, compact, and wide widths and returns bounded layout/typography values.
- [x] Invalid or missing width input fails safely to the phone layout rather than selecting a desktop composition.
- [x] `ProductScreenShell` consumes the responsive baseline while retaining its bounded wide presentation.
- [x] `/auth-provider` stacks its primary composition at phone and compact widths, uses bounded headings/padding, and keeps role selection, forms, and actions readable.
- [x] `/auth-provider` retains the intentional provider default and credential request role propagation.
- [x] `/auth` phone entry and keypad do not overflow or clip at 320, 360, 390, or 430px.
- [x] Wider web layouts retain an intentional split presentation.
- [x] Product tests, workspace typecheck, Expo web export, CI-equivalent checks, and focused browser QA pass.

## Validation Contract

### Assertions (written before implementation)

- [x] Widths `320`, `360`, `390`, and `430` resolve to the phone layout with bounded title, gutter, and panel-padding values.
- [x] Intermediate widths resolve to compact single-column composition.
- [x] Wide widths resolve to the split-capable layout and preserve the existing maximum content width.
- [x] Non-finite, missing, zero, and negative widths fail closed to phone layout.
- [x] The shared shell uses responsive title/gutter/panel values.
- [x] Provider auth renders the main content as one column below the wide breakpoint and only splits at wide width.
- [x] Role cards stack on phone widths and remain side-by-side when sufficient width exists.
- [x] The phone keypad's three-column sizing remains within the available 320px viewport content width.
- [x] Existing auth role resolver tests prove customer fallback and provider override behavior.
- [x] Existing credential request tests prove the selected provider role is serialized unchanged.
- [x] `pnpm check` passes with zero errors.
- [x] Product tests and all CI-equivalent tests/builds pass.
- [x] Expo web export resolves every modified route/import.
- [x] Browser QA at 320, 360, 390, 430, and a wide viewport shows no horizontal overflow, clipped controls, or unreadable text wrapping on `/auth` and `/auth-provider`.

### Performance bounds

- Responsive resolution is constant-time pure arithmetic with no I/O, subscriptions beyond React Native's existing window-dimension hook, timers, or list work.
- Viewport changes cause only the normal component rerender; no polling or resize event handler is added manually.

### Interface contracts

- No backend, API-client, session, authorization, payment, persistence, or navigation-route contract changes.
- `AuthEntryScreen` keeps `initialRole`, `onSignIn({ email, password, role })`, and `onCreateAccount({ name, email, password, role })` unchanged.
- `PhoneEntryScreen` keeps `onSendCode({ phone })` and `onUseProviderSignIn` unchanged.
- The responsive helper is product-app-local and introduces no new dependency or cross-package public API.

## Implementation plan

1. Add RED-first unit coverage for viewport classification, safe fallback behavior, typography/gutter bounds, and keypad column fit.
2. Add a small pure responsive-layout resolver plus a hook wrapper around `useWindowDimensions` under `apps/product-app/src/shared/`.
3. Update `ProductScreenShell` to use the shared responsive values for outer gutter, panel padding/radius, and title sizing.
4. Recompose `AuthEntryScreen` responsively: bounded display type, single-column phone/compact layout, phone-stacked role cards, reduced panel padding, and a wide-only side-by-side presentation.
5. Update `PhoneEntryScreen` and `PhoneKeypad` only where the 320px fit contract requires it.
6. Reconcile `docs/planning/13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md` with delivered phases and insert the #55 responsiveness milestone before remaining provider/admin/secondary work.
7. Run focused RED/GREEN tests, product tests, workspace typecheck, Expo export, browser QA at the viewport matrix, and the full CI-equivalent command set.
8. Perform a fresh diff review, fix actionable findings, persist execution/validation/review/checkpoint evidence, commit atomically, open the PR, and complete the CI/CodeRabbit loop.

## Edge cases and failure handling

- SSR/test environments or transient invalid widths select the phone-safe layout.
- Very narrow screens remain scrollable vertically; no fixed-height wrapper is introduced.
- Long provider/customer helper copy wraps in a full-width column rather than competing with a second grid column.
- Keyboard or error states must not make the primary form action unreachable.
- Decorative background elements must not create horizontal overflow.

## Rollback

Frontend and documentation only. Reverting the responsive helper, screen composition changes, tests, and roadmap reconciliation restores the prior layout; no migration or data rollback is required.

## Verification commands

```sh
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-56-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

The repository has no lint command. Focused browser QA is required in addition to these commands.

## Gate Result

- Gate: Verify
- Status: PASS
- Evidence: RED module-resolution failure recorded; 13 responsive contract tests, 298 product tests, workspace typecheck, Expo export, CI-equivalent tests/builds, and browser QA at 320/360/390/430/600/1024px passed.
- Remaining gaps: remote PR CI and CodeRabbit review have not run.
- Next action: commit the validated slice, open the PR, and complete the remote review loop.

## Execution evidence

- RED: focused tests failed because `responsive-layout` did not exist.
- GREEN: responsive tests passed 13/13; auth role/action contract tests passed 8/8.
- Product suite: 298 passed.
- Platform API: 334 passed, 3 skipped.
- Admin web: 46 passed.
- Workspace typecheck, background-worker build, admin build, platform API build, and Expo web export passed.
- Browser QA: both auth routes had zero horizontal overflow and zero console errors across the required matrix; 320px provider forms remained operable and phone keypad input rendered `123 456 7890`.
