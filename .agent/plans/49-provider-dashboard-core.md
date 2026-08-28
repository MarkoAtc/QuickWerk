# Issue #49 — Provider Dashboard Core and Live Requests

## Issue

[#49 — Repair provider request dashboard and match core approved design](https://github.com/MarkoAtc/QuickWerk/issues/49)

## Goal

Repair the provider workspace's authenticated booking-load contract and deliver the core mobile provider dashboard shown in `design/provider_dashboard`: real provider identity/access status, real submitted-booking requests, and working accept/decline actions. Do not fabricate mockup metrics that have no authoritative data source.

## Branch

`codex/fix/49-provider-dashboard-core`

## Plan file path

`.agent/plans/49-provider-dashboard-core.md`

## Acceptance Criteria

- [x] The dashboard resolves the current session token once and supplies it to every authenticated provider request.
- [x] Approved providers load submitted bookings with validated service, optional customer location, status, and creation time.
- [x] Unapproved providers stay gated and the booking-list endpoint is not called.
- [x] Provider profile lookup supplies a real display name/photo when available and degrades to a neutral identity when unavailable.
- [x] The screen follows the core approved structure: compact Handwerker header, provider identity, stacked authoritative metric cards, live-request count, compact request cards, and provider navigation actions.
- [x] Accept and decline use the existing backend contracts, show per-request pending/error/success feedback, and remove the transitioned booking from the open queue.
- [x] Empty, loading, blocked, and request-failure states are explicit and recoverable.
- [x] Revenue, quality ranking, job-volume charts, and schedule rows are not shown until authoritative provider-scoped data exists.
- [x] Product tests, workspace typecheck, CI-equivalent checks, Expo web export, and mobile browser QA pass.

## Risk / TDD Classification

`risky-logic` for provider gating and booking transitions. RED proof will cover the current incorrect token call, strict booking parsing, the rule that blocked providers never load bookings, and the new decline request contract before implementation. The visual rewrite is `low-risk/UI` and will use Expo export plus mobile browser comparison against `design/provider_dashboard/screen.png`.

## Validation Contract

### Assertions (written before implementation)

- [x] `listBookingsRequest('provider-token')` sends `Authorization: Bearer provider-token` and never serializes an object into the header.
- [x] The list action accepts valid submitted booking summaries, preserves optional `customerLocation`, and rejects malformed required fields.
- [x] Dashboard loading requests verification and profile context; it requests bookings only when verification is approved.
- [x] Profile lookup failure degrades to a neutral profile warning without suppressing an otherwise valid request queue.
- [x] `declineProviderBookingRequest` sends the existing JSON decline contract with bearer authentication and accepts only a `declined` response.
- [x] Accept/decline success removes the request locally and exposes factual success feedback; failures leave the request actionable.
- [x] Typecheck passes with zero errors.
- [x] Product tests pass with zero failures.
- [x] Expo web export resolves all JavaScript imports.

### Performance bounds

- Verification and profile requests run in parallel.
- The booking-list request runs at most once per dashboard load and only after approval is confirmed.
- No polling, timers, or unbounded client aggregation are introduced.

### Interface contracts

- No backend or shared API-client contract changes.
- Existing endpoints remain authoritative: `GET /api/v1/providers/me/verification`, `GET /api/v1/providers/me/profile`, `GET /api/v1/bookings`, `POST /api/v1/bookings/:bookingId/accept`, and `POST /api/v1/bookings/:bookingId/decline`.
- Request cards display only fields already returned by the booking-list endpoint.

## Implementation Plan

1. Add RED-first action/orchestration tests for the token contract, strict booking parsing, approval gating, profile fallback, and decline behavior.
2. Extend `provider-screen-actions.ts` with validated booking summaries, decline support, and a typed dashboard loader that composes existing verification/profile/list operations.
3. Add small pure presentation helpers for provider identity, profile/access labels, and deterministic request timestamps.
4. Rework `provider-screen.js` around one recoverable dashboard state and one bounded booking-action state while preserving sign-out, onboarding, payouts, and active-job navigation.
5. Rebuild the visual composition against `design/provider_dashboard/screen.png`, using stacked metric cards and compact request cards without unsupported fake metrics.
6. Run focused RED/GREEN tests, the complete product suite, workspace typecheck, repository CI-equivalent builds/tests, Expo export, and mobile browser QA.
7. Self-review the diff and record any unsupported dashboard metrics or messaging work as separate Issue Drafts rather than expanding this slice.

## Edge Cases

- Missing or expired session: sign out and redirect to `/auth`.
- Verification not submitted/pending/rejected: show the existing bounded gate message and onboarding CTA; do not fetch bookings.
- Profile missing/private/load failure: show a neutral provider identity; preserve request access when approval is valid.
- Malformed booking item: fail the queue load instead of rendering blank actions or identifiers.
- Accept/decline conflict: keep the row and surface the server-derived HTTP failure.
- Missing customer location: render `Location not provided`.
- Empty approved queue: render a factual empty state with refresh.

## Rollback

Frontend-only. Reverting the provider screen, its action/helper changes, and tests restores the previous workspace. No data or API rollback is needed.

## Verification Commands

```sh
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-provider-dashboard-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

No lint command exists in the repository.

## Execution Evidence

- RED: focused provider tests initially failed on the missing presenter, dashboard orchestration, strict booking parsing, and decline contract (8 failures).
- GREEN: focused provider coverage passed (31 tests); the complete product app suite passed (282 tests).
- CI-equivalent: `pnpm check`, background-worker build, platform API tests (334 passed, 3 skipped), admin tests (46 passed), admin build, and platform API build all passed.
- Packaging: Expo web export completed successfully.
- Browser QA: approved-provider sign-in loaded real profile and request data at desktop and 390 × 844 mobile sizes; one decline and one accept both removed the selected row and rendered the correct success state; browser console had no warnings or errors.
- Fresh review: tightened accept/decline response identity/status checks, serialized Home refresh against active transitions, added dynamic accessibility semantics, and added native safe-area handling. Post-fix typecheck, product tests, Expo export, and browser smoke all passed.
- Self-review: no backend/shared contract change, unsupported financial/quality/schedule metrics, secrets, or unrelated user-owned files are included. No actionable correctness, security, or accessibility issue remains in the slice.
- Repository note: the documented `pnpm test:run` and `pnpm build` root aliases do not exist; validation used the commands defined in `.github/workflows/ci.yml`.
