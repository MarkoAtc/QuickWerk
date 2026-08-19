# TEC-92: Unblock provider sign-up/sign-in on the live UI

## Issue

**Issue Draft:**

- **Title:** No real user can reach a provider-role session through the live UI
- **Body:** Discovered while scoping TEC-90 (provider payout visibility): `/auth-provider`'s sign-in always requires a password, and whenever a password is sent, `InMemoryAuthSessionRepository.createSession` hardcodes the resulting role to `'customer'` regardless of the account's actual role. `/auth-provider`'s sign-up explicitly blocks any role other than `'customer'` (`"Provider account creation is not available yet."`). `registerCustomer` (both repositories) only ever creates `role: 'customer'` accounts, and no other code path anywhere mutates a user's `role` after creation (confirmed: provider verification approve/reject touches verification status only, never `users.role`). Net effect: the entire provider side of the app — provider dashboard, onboarding, booking accept/decline, and the not-yet-built payouts screen — is unreachable by any real user going through the UI, in both in-memory and Postgres modes.
- **Acceptance criteria:**
  1. A new user can sign up as a provider through `/auth-provider`'s existing role cards + "Create account" tab.
  2. A provider can sign in and get back a `role: 'provider'` session, both in-memory and Postgres.
  3. Existing gating (provider verification/booking-access approval, TEC-87) is untouched — a freshly-signed-up provider still starts unverified and hits the existing access gate until approved.
  4. Customer sign-up/sign-in behavior is unchanged.
- **Labels:** `auth`, `product-app`, `platform-api`, `bug`

**Scope authorization:** AGENTS.md §7 requires board approval before changing auth controls. The user explicitly directed this fix in-session (2026-08-19) after being shown the reachability gap, in the same session where the equivalent authorization was already given for the TEC-91 OTP mechanism.

## Branch

`feature/tec-92-provider-signin-signup`

## Root cause (two separate bugs, same symptom)

1. **No way to create a provider account.** `registerCustomer` (service + both repo implementations) hardcodes `role: 'customer'`. The frontend already has provider role-selector cards on `/auth-provider` but blocks submission for any non-customer role.
2. **In-memory sign-in silently downgrades role.** `InMemoryAuthSessionRepository.createSession`: `const role = isPasswordAuthInput(input) ? 'customer' : input.role;` — any password-authenticated sign-in gets `'customer'` no matter what role the account was actually registered with. (The Postgres repository already does this correctly — it reads `role` off the `users` row — so this is an in-memory-only inconsistency.)

## Plan

### Backend
- `services/platform-api/src/auth/domain/auth-session.repository.ts`: add `role: SessionRole` to `RegisterCustomerInput`.
- `services/platform-api/src/auth/auth.controller.ts`: add `role?: string` to `SignUpRequestBody`.
- `services/platform-api/src/auth/auth.service.ts`: `signUp` resolves role via the existing `resolveRole` helper (already handles `provider`/`operator`/defaults `customer` — same helper `signIn` already uses) and passes it to `registerCustomer`.
- `services/platform-api/src/auth/infrastructure/in-memory-auth-session.repository.ts`:
  - `registerCustomer` stores the requested role on the `RegisteredCustomer` record (not hardcoded).
  - `createSession`'s password-authed branch reads the registered user's actual role instead of hardcoding `'customer'`.
- `services/platform-api/src/auth/infrastructure/postgres-auth-session.repository.ts`: `registerCustomer`'s `INSERT INTO users` uses the passed-in role instead of the hardcoded `'customer'` literal. (Sign-in path already correct — no change needed there.)
- `packages/api-client/src/index.ts`: add `role?: SessionRole` to `SignUpRequestBody`.

### Frontend
- `apps/product-app/src/features/auth/auth-entry-actions.js`: `signUpWithCredentials` passes `role` through.
- `apps/product-app/app/auth-provider.js`: remove the `if (role !== 'customer') { blocked }` guard in `handleCreateAccount`; pass the selected role to `signUpWithCredentials`.

### Tests
- `auth.service.test.ts`: sign-up with `role: 'provider'` returns a provider session; sign-in afterward (password path) also returns `role: 'provider'` (regression-covers bug #2).
- `in-memory-auth-session.repository.test.ts`: registered provider role survives both `registerCustomer` and a subsequent `createSession` password sign-in.
- `postgres-auth-session.repository.test.ts`: `registerCustomer` INSERT includes the requested role (assert on captured query params, same pattern already used for the password-hash assertion in that file).
- `auth-entry-actions.test.js`: `signUpWithCredentials` sends `role` in the request body.

## Verification commands

```bash
pnpm --filter @quickwerk/platform-api typecheck
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus a live browser-driven check via `.claude/skills/browser-drive`: sign up as a provider through `/auth-provider`, confirm redirect to `/provider` and the existing booking-access gate still shows (unverified state), matching TEC-87's existing behavior.

## Not in scope

- TEC-90 (provider payout visibility) — this ticket exists specifically to unblock it; TEC-90 proceeds immediately after this merges.
- Any change to provider verification/approval logic (TEC-84/TEC-87) — untouched.
