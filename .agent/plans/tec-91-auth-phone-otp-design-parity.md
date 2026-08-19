# TEC-91: Auth screen — literal phone+OTP design parity

## Issue

**Issue Draft** (no GitHub issue / Paperclip ticket exists yet for this work):

- **Title:** Rebuild product-app auth entry to match approved Stitch design (phone + OTP)
- **Body:** Marko's Stitch design (`design/authentication/code.html`), approved by the client, specifies phone-number + OTP-keypad sign-in — not the email/password form currently implemented. The 2026-05-15 "showcase" pass adopted the new design tokens (colors/typography) across screens but did not rebuild screen structure/flows to match the mockups (confirmed by direct comparison: current `auth-entry-screen.js` is email/password + role cards; the mockup is phone + numeric keypad + OTP). This ticket builds the first literal, structurally-accurate implementation of an approved design screen, both backend (new phone/OTP auth mechanism — currently doesn't exist at all) and frontend.
- **Acceptance criteria:**
  1. Backend exposes `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/verify` that create/reuse a customer session by phone number, additive to (not replacing) existing email/password sign-in/sign-up (still used by operator/admin paths).
  2. Product-app auth entry screen visually and structurally matches `design/authentication/code.html`: phone input with country-code chip, on-screen numeric keypad, "Send OTP" CTA, Google/Apple buttons (visual only — no OAuth backend exists, out of scope), terms footer, dark-hero/glass-panel treatment.
  3. A follow-on OTP-code-entry screen exists (not present in the static mockup — extrapolated in the same visual language) to complete the flow end to end.
  4. Existing session/role machinery (`session-provider.js`, `resolveSessionToken`) continues to work unchanged; provider accounts remain reachable (see Open Decision below).
  5. `pnpm --filter @quickwerk/platform-api test`, `pnpm --filter @quickwerk/product-app test`, and `pnpm -r typecheck` pass.
- **Labels:** `design-parity`, `auth`, `product-app`, `platform-api`
- **Note on scope authorization:** AGENTS.md §7 requires board approval before changing auth controls. User explicitly authorized building the real phone+OTP mechanism in this session (2026-08-19) after being shown the alternative (visual-only reskin) and the backend gap. Record this approval in the PR description.

**Reserved-number note:** `TEC-89`/`TEC-90` are already reserved in `docs/planning/12_QuickWerk-Handoff-to-Marko-2026-04-16.md` for provider payout visibility work (unrelated, not yet executed). This ticket uses `TEC-91` to avoid collision.

## Branch

`feature/tec-91-auth-phone-otp-design-parity`

## Plan file path

`.agent/plans/tec-91-auth-phone-otp-design-parity.md` (this file)

## Verification commands

Root `package.json` only defines `check`/`typecheck` (both `pnpm -r --if-present typecheck`) and `dev*` scripts — AGENTS.md's `pnpm test:run` / `pnpm build` do not exist at the root. Use per-workspace scripts:

```bash
pnpm --filter @quickwerk/platform-api typecheck
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm --filter @quickwerk/api-client typecheck
pnpm -r typecheck   # full workspace sweep
```

(No product-app `build` script exists — Expo app, not build-checked here. `apps/admin-web`/`services/platform-api` have `build` but this ticket doesn't touch them.)

---

## Context already established (do not re-derive)

- `packages/ui/src/index.ts`: design tokens (colors/typography/spacing/radius/shadow) already match `design/design_system/DESIGN.md`. No reusable JSX component primitives exist — only RN style-preset objects (`componentStyles`, `shared`). This ticket does not build a primitives library; keep using the existing preset-object pattern for consistency with the rest of the codebase.
- Backend auth (`services/platform-api/src/auth/`): `AuthController` → `AuthService` → `AuthSessionRepository` (interface in `domain/auth-session.repository.ts`, implementations: `in-memory-auth-session.repository.ts`, `postgres-auth-session.repository.ts`). Only `email`/`password`/`role` exist today — no `phone` field anywhere, no OTP concept, no SMS/email delivery integration in the whole repo (grepped, confirmed absent).
- `users` table has had two same-numbered migrations already (`0009_booking_customer_location.sql` and `0009_signup_customer_profile_fields.sql`) — filename collision, but distinct names so no overwrite risk. This ticket adds `0010_phone_otp_auth.sql`, continuing the sequence past both existing `0009_*` files.
- Frontend auth: `apps/product-app/app/auth.js` (route, owns loading/error state + session-setting) → `AuthEntryScreen` (`src/features/auth/auth-entry-screen.js`) for presentation, `auth-entry-actions.js` for the fetch calls via `@quickwerk/api-client`'s `createSignInRequest`/`createSignUpRequest`. Session lives in `SessionProvider`/`useSession` (`src/shared/session-provider.js`).
- `admin-web` has its own separate operator session path (`resolveOperatorSession`) — untouched by this ticket, still email/password.

---

## Slice 1 — Backend: additive phone+OTP auth mechanism

**Goal:** new endpoints that create/reuse a customer session by phone, without touching existing email/password behavior.

### Data model changes
`services/platform-api/migrations/0010_phone_otp_auth.sql`:
- `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;` + unique partial index on `phone` where not null (nullable/backward-compatible, same pattern as `0009_signup_customer_profile_fields.sql`).
- New table `otp_codes`: `id uuid pk`, `phone text not null`, `code_hash text not null`, `expires_at timestamptz not null`, `consumed_at timestamptz null`, `attempt_count int not null default 0`, `created_at timestamptz not null default now()`. Index on `(phone, expires_at)` for lookup/cleanup.
- Append to `services/platform-api/migrations/README.md` following the existing per-migration bullet format, and to the `psql` run list.

### API changes
`services/platform-api/src/auth/auth.controller.ts`:
- `POST /api/v1/auth/otp/request` — body `{ phone }` → `AuthService.requestOtp(phone)`.
- `POST /api/v1/auth/otp/verify` — body `{ phone, code, role? }` → `AuthService.verifyOtp(...)`, returns the same session shape `signIn`/`signUp` already return (`{ ...getSession(token), token }`) so frontend handling stays uniform.

`services/platform-api/src/auth/auth.service.ts`:
- `requestOtp(phone)`: normalize phone (E.164-ish: strip non-digits, require leading `+` and country code), generate a 6-digit code, delegate storage to the repository, log via `logStructuredBreadcrumb({ event: 'auth.otp.requested', ... })`.
- **Delivery gap (flag, don't silently decide in code):** no SMS/email provider exists in this repo. Log the code via structured breadcrumb (existing pattern) and echo it in the response as `devOtpCode` *only* when `resolvePersistenceMode() === 'in-memory'` (i.e., local/demo runs) — mirrors how the rest of the repo keeps demo ergonomics separate from the postgres-backed path. Confirm this is acceptable before executing; the alternative is a no-op "delivery" with no way to complete the flow outside logs.
- `verifyOtp({ phone, code, role })`: repository validates code + expiry + attempt cap, upserts a `users` row by phone (role defaults `'customer'` — see Open Decision below), creates a session identical in shape to `createSession`.

`services/platform-api/src/auth/domain/auth-session.repository.ts`:
- Add `requestOtp(phone: string): Promise<{ expiresAt: string; devCode?: string }>` and `verifyOtp(input: { phone: string; code: string; role?: SessionRole }): Promise<AuthSession>` to `AuthSessionRepository`.
- Add `InvalidOtpError` / `OtpExpiredError` classes alongside `DuplicateEmailError` for the service to translate into `BadRequestException`/`ConflictException`, matching the existing `signUp` error-translation pattern.

`packages/api-client/src/index.ts`:
- Add `authApiRoutes.otpRequest`/`otpVerify`, `OtpRequestBody`/`OtpVerifyBody` types, `createOtpRequestRequest`/`createOtpVerifyRequest` helpers — mirror `createSignInRequest`/`createSignUpRequest` exactly.

### Implementation touch points
- `services/platform-api/src/auth/infrastructure/in-memory-auth-session.repository.ts` — add an in-memory `Map<phone, {codeHash, expiresAt, attempts}>` OTP store.
- `services/platform-api/src/auth/infrastructure/postgres-auth-session.repository.ts` — implement against `otp_codes` + `users.phone`, reusing the existing `scrypt`/`timingSafeEqual` helpers already in that file for code hashing (same pattern as password hashing).

### Tests
- `services/platform-api/src/auth/auth.service.test.ts` (existing file) — add cases: request generates code + expiry, verify with correct code succeeds and returns session, verify with wrong/expired/over-attempted code fails, second verify for same phone reuses the same user (no duplicate).
- `in-memory-auth-session.repository.test.ts` / `postgres-auth-session.repository.test.ts` (existing files) — mirror the same cases at the repository layer.
- No `auth.controller.test.ts` exists today for this controller — do not add one unless the execute pass finds it's needed for coverage parity; the service/repository tests are the existing coverage pattern for this module.

### Edge cases
- Malformed/missing phone → `BadRequestException`, same style as `normalizeEmail`.
- Expired code, wrong code, exceeded attempt cap (cap at 5, matching a reasonable throttle) → distinct error messages, all surfaced as 400s.
- Repeated `otp/request` calls for the same phone before expiry: invalidate the previous code (one active code per phone), don't stack them.
- No rate limiting infra exists in this repo (checked) — add a minimal in-memory cooldown (e.g. reject a second `otp/request` for the same phone within 30s) directly in the service; don't pull in new dependencies for this.

---

## Slice 2 — Frontend: rebuild auth screen to match the mockup

### UI changes
`apps/product-app/src/features/auth/`:
- New `phone-entry-screen.js`: rebuild to match `design/authentication/code.html` structurally — dark hero (`Handwerker` / "Enter your phone to continue"), glass-panel phone input with country-code chip, 3×4 on-screen numeric keypad (custom `Pressable` grid — RN has no built-in equivalent, this is genuinely new component work, not a reskin), orange "Send OTP" CTA, Google/Apple buttons (rendered, disabled/non-functional — no OAuth backend exists; note this clearly in the UI or omit press handlers), terms footer. Use existing `colors`/`typography`/`spacing`/`radius` tokens from `@quickwerk/ui`, no new token work needed.
- New `otp-verify-screen.js`: **not present in the static mockup** — extrapolated in the same visual language (dark hero, glass panel, 6-digit code boxes instead of a phone field, same keypad component reused for code entry, resend-code affordance, same CTA treatment). Flag this explicitly as a design gap in the PR description — Marko/client should sanity-check this screen since it wasn't in the approved export.
- New `auth-otp-actions.js`: wraps `createOtpRequestRequest`/`createOtpVerifyRequest`, mirrors `auth-entry-actions.js`'s `runAuthRequest` pattern exactly (same error/ok shape) so `app/auth.js` doesn't need new error-handling branches.
- `apps/product-app/app/auth.js`: replace the current `handleSignIn`/`handleCreateAccount` (email/password) wiring with a small local state machine: `phone-entry` → `otp-verify` → set session (reuses existing `setSession`/`router.replace` logic, role-branch unchanged).

### Open decision — role selection
The mockup has no role selector, but `createSession`/`verifyOtp` still needs a `role`. Recommendation: default phone+OTP entry to `customer` (matches the primary consumer flow the design targets), and keep a small secondary link ("I'm a provider" / "Continue as provider") that routes to the existing email/password provider path rather than rebuilding provider auth on this ticket — provider account creation is already gated (`"Provider account creation is not available yet."` in `app/auth.js`) so this doesn't reduce provider capability. Confirm this with the user/Marko before executing if a different split is wanted.

### Tests
- `apps/product-app/src/features/auth/auth-entry-actions.test.js` (existing) — add `auth-otp-actions.test.js` following the same shape (mock `fetch`, assert request path/body, assert `ok`/`error` mapping).
- Add/extend a screen-level test for `phone-entry-screen.js` if the existing auth screen has one to follow (check `auth-entry-screen.test.js` presence before deciding whether to add one — keep parity with existing coverage, don't invent a new test style).

### Edge cases
- Empty/incomplete phone number: disable "Send OTP" until a plausible length is entered (mirror `isSignInDisabled`-style guard already used in the current screen).
- OTP request failure (network/500): surface via the same bottom error banner pattern already in `app/auth.js`.
- User backs out of OTP-verify back to phone-entry: must be able to re-request a code (respecting the 30s cooldown from Slice 1 — surface the cooldown as a disabled/countdown state on the CTA, not a silent failure).

---

## Rollback considerations

- Migration is purely additive (`ADD COLUMN IF NOT EXISTS`, new table) — no destructive change to existing `users`/`sessions` rows. Manual rollback only (repo has no migration runner yet, per `migrations/README.md`); a rollback would be `DROP TABLE otp_codes; ALTER TABLE users DROP COLUMN phone;` if ever needed.
- Existing email/password sign-in/sign-up endpoints, service methods, and repository methods are untouched — zero risk to operator/admin login or any other consumer of those paths.
- If the new phone-entry screen needs to be pulled quickly post-deploy, `app/auth.js` can be reverted independently of the backend endpoints (backend stays additive and harmless if unused).

---

## Execution order

1. Migration + repository interface + both repository implementations + service methods + controller endpoints + api-client contracts (Slice 1, backend-only, testable in isolation).
2. `phone-entry-screen.js` + `otp-verify-screen.js` + `auth-otp-actions.js` + `app/auth.js` rewiring (Slice 2, depends on Slice 1's contracts existing).
3. Run full verification command list above before opening the PR.
4. Per `AGENTS.md` §3: after pushing, run `.agent/workflows/review-pr.md` and resolve CodeRabbit/CI feedback before marking in-review.
