# Issue #63 — Local-only browser auth fixture

## Goal

Provide an explicitly enabled, in-memory-only customer session fixture so browser QA can reach protected product-app routes without sending an OTP.

## Plan

1. Guard a fixed-customer fixture behind `QUICKWERK_LOCAL_E2E_AUTH=true` and `PERSISTENCE_MODE=in-memory`.
2. Expose it only through a local product-app affordance that requires `EXPO_PUBLIC_LOCAL_E2E_AUTH=true`.
3. Persist that fixture session only in browser `sessionStorage`, and only under that same explicit product-app flag.
4. Cover the allow/deny and customer-only contracts; run API, product-app, workspace, build, export, and browser checks.

## Validation Contract

- Disabled or non-in-memory execution cannot mint a session.
- The API and client always produce a customer role; callers cannot select a role.
- Standard OTP and ordinary production configuration remain unchanged.
- Browser QA can authenticate and reach #62 protected routes without horizontal overflow.

## Gate Result

- Gate: Verify
- Status: PASS
- Evidence: API tests (335 passed, 3 skipped), product-app tests (332 passed), workspace type-check, API/admin/worker builds, Expo web export, and local browser route matrix all passed. The only browser network errors were the expected 404 responses for deliberately nonexistent `bookingId=e2e` error-state coverage.
- Remaining gaps: fresh review, commit, PR, CI, and CodeRabbit.
- Next action: create the execution report and prepare the review/commit boundary.
