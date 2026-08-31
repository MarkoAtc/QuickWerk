# Plan — #75 Sign-in route responsiveness

## Issue and scope

- **Issue:** [#75](https://github.com/MarkoAtc/QuickWerk/issues/75)
- **Parent:** Refs #55 and #73
- **Branch:** `codex/fix/75-sign-in-responsive`
- **Scope:** Make the existing `/sign-in` presentation phone-safe. The sign-in request, session update, role selection, and redirects are out of scope.

## Risk / TDD classification

`risky-logic` — add a pure layout policy and RED/GREEN tests first, then consume the policy without changing action/state behavior.

## Validation Contract

### Assertions

- [ ] 320, 360, 390, and 430px use phone-safe gutters, card padding, and stacked role controls with 44px-or-greater controls.
- [ ] 1024px retains an intentional row role composition; invalid widths fail closed to phone-safe values.
- [ ] Empty, submitting, error, and role-selection behavior is unchanged.
- [ ] Focused policy tests, product tests, type-check, Expo export, and browser QA are recorded.

### Performance bounds

`N/A —` pure layout selection has no I/O, storage, timers, or requests.

### Interface contracts

`N/A —` no changes to authentication, API requests, sessions, authorization, persistence, or navigation contracts.

## Implementation slices

1. Add the layout policy plus RED/GREEN coverage.
2. Apply it to form/card/input/role/button presentation only.
3. Verify the focused suite, complete CI and browser QA before review.
