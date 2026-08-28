# Issue #51 — Provider auth entry default role

## Goal

Make the legacy email/password entry reached through `/auth-provider` initialize in provider mode while preserving the customer default of the reusable auth entry screen. The selected role must continue to flow unchanged into sign-in and sign-up requests.

## Execution contract

- **Issue:** #51
- **Branch:** `codex/fix/51-provider-auth-default-role`
- **Plan:** `.agent/plans/51-provider-auth-default-role.md`
- **Classification:** `risky-logic` — the route influences the role sent through authentication requests.
- **RED proof:** focused tests must fail before implementation because the initial-role resolver/contract does not exist and the provider route supplies no provider default.
- **GREEN proof:** focused auth tests pass after the provider route supplies the provider role, the reusable screen preserves its customer fallback, and request tests demonstrate selected-role propagation.

## Acceptance criteria

- [x] `/auth-provider` initializes the shared auth entry with the provider role selected and provider-relevant helper copy.
- [x] The reusable auth entry continues to default to the customer role when no override is supplied.
- [x] Sign-in and sign-up requests use the role currently selected by the user.
- [x] Regression tests cover the customer fallback, provider override, invalid fallback, and selected-role request propagation.
- [x] Product-app and CI-equivalent checks remain green.

## Validation Contract

### Assertions (written before implementation)

- [x] Resolving an omitted initial role returns `customer`.
- [x] Resolving the provider route override returns `provider`.
- [x] Unsupported initial-role values fail closed to `customer`.
- [x] The `/auth-provider` route explicitly supplies the provider override to `AuthEntryScreen`.
- [x] Credential sign-in and sign-up requests serialize the selected provider role.
- [x] Workspace type-check, product-app tests, and all CI-equivalent tests/builds pass.

### Performance bounds

- N/A — the change is local state initialization and static copy with no new I/O or iterative work.

### Interface contracts

- `AuthEntryScreen` accepts optional `initialRole`; omitted/invalid values resolve to `customer`, while `provider` resolves to `provider`.
- `onSignIn({ email, password, role })` and `onCreateAccount({ name, email, password, role })` receive the currently selected role.
- No backend authentication, authorization, session, payment, or retention contract changes.

## Implementation plan

1. [x] Add focused role-resolution tests first and record the failing RED result.
2. [x] Add a small auth-entry role resolver/constants module with a customer-safe fallback.
3. [x] Initialize `AuthEntryScreen` from the optional route-provided role and make its helper copy reflect the selected role.
4. [x] Pass the provider override explicitly from `/auth-provider`.
5. [x] Strengthen credential-action regression coverage for selected provider-role serialization.
6. [x] Run focused tests, product-app tests, workspace type-check, Expo web export, and the complete CI-equivalent suite.
7. [x] Review the diff for scope, auth-boundary safety, and acceptance-criteria coverage; persist an execution handoff.
8. [ ] Commit, open a PR linked with `Fixes #51`, then monitor CI and CodeRabbit until no actionable feedback remains.

## Rollback

Revert the issue commit. The prior behavior is fully restored because there are no migrations, persisted state changes, or API changes.

## Gate Result

- Gate: Verify
- Status: PASS
- Evidence: RED import failure recorded; focused auth tests 8/8, product-app tests 285/285, workspace type-check, Expo web export, browser QA, and the complete CI-equivalent suite all passed.
- Remaining gaps: remote PR checks and CodeRabbit review have not run yet.
- Next action: commit the validated slice and open the pull request.
