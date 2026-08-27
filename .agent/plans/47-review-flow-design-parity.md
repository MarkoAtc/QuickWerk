# Issue #47 — Repair dedicated review flow and match approved review design

## Title
Fix the completed-booking review route and bring it to `design/review_rating` demo fidelity

## Problem
The dedicated `/review` route is reachable from booking completion but cannot run: it imports a nonexistent `submitBookingReview` symbol and calls `loadBookingReviews` with an object instead of the required session token and booking id. The route is JavaScript outside the product app's TypeScript include, and CI does not bundle the Expo web app, so the broken named import passed existing checks. The rendered screen also predates the approved `design/review_rating` mockup and does not use the real booking/provider context already available through API contracts.

## Goal
Restore the customer-facing completed-booking review journey, preserve the existing review API and authorization behavior, and rebuild the dedicated screen around the approved rating design using real booking/provider data wherever the current backend exposes it.

## Acceptance Criteria
- [x] Unauthenticated access redirects to `/auth`; an authenticated session token is supplied to every booking-scoped request.
- [x] `/review?bookingId=...` loads a completed booking and its existing reviews, and loads the assigned provider's public-safe name/photo when a public profile is available.
- [x] Missing booking ids, non-completed bookings, failed requests, and malformed required payloads render recoverable error states rather than crashing.
- [x] The screen matches the approved design structure: close/header, provider identity, service context, five-star selection with rating label, highlight chips, 500-character comment field, photo affordance, orange submit CTA, and success state.
- [x] Highlight chips are persisted without a schema change by composing a human-readable `Highlights: ...` prefix into the existing optional review comment.
- [x] The photo affordance is explicitly labeled as a local demo attachment and is never represented as uploaded or persisted.
- [x] Existing reviews authored by the current role are detected and shown as already submitted instead of inviting a misleading duplicate submission.
- [x] Regression tests cover route data loading, authenticated request construction, required error branches, rating labels, highlight toggling, and composed comments.
- [x] Product tests, workspace type-check, CI-equivalent checks, and an Expo web export smoke pass.

## Labels (suggested)
- bug
- frontend
- design-parity
- reviews

## Priority
P1 — confirmed runtime failure on a shipped route.

## Issue
[#47 — Fix completed-booking review route and match approved design](https://github.com/MarkoAtc/QuickWerk/issues/47)

## Branch
`codex/fix/47-review-flow-design-parity`

## Plan file path
`.agent/plans/47-review-flow-design-parity.md`

## Risk/TDD classification
`risky-logic` for the route data contract and review-comment composition because incorrect request wiring currently crashes the route and incorrect composition would persist misleading user content. Add failing tests for the authenticated load contract and comment/highlight behavior before implementation. The presentational styling is `low-risk/UI` and will use design screenshot comparison plus an Expo web export as substitute proof.

## Validation Contract

### Assertions (written before implementation)
- [x] `loadReviewScreenData('token', 'booking-1')` sends bearer-authenticated booking and booking-review requests.
- [x] A completed booking returns real `requestedService`, optional public provider name/photo, and parsed existing reviews.
- [x] A missing/invalid booking payload, non-completed booking, or failed required request returns an error result.
- [x] Public provider lookup failure degrades to a safe fallback identity without failing the review form.
- [x] Rating values map deterministically to `Poor`, `Fair`, `Good`, `Very Good`, and `Excellent`.
- [x] Selecting/deselecting highlights is deterministic and composed review comments contain the readable highlight prefix without changing the backend contract.
- [x] `submitReview` sends the existing `{ rating, comment? }` body with bearer authentication and JSON content type.
- [x] Type-check passes with zero errors.
- [x] Product tests pass with zero failures.
- [x] Expo can export the web bundle, proving every JavaScript route import resolves.

### Performance bounds
- One required booking request followed by parallel review/provider requests; no polling, timers, or unbounded list work.

### Interface contracts
- No backend, database, auth, payment, or shared API-client contract changes.
- Existing endpoints remain authoritative: `GET /api/v1/bookings/:bookingId`, `GET/POST /api/v1/bookings/:bookingId/reviews`, and optional public `GET /api/v1/providers/:providerUserId`.
- Review submission remains `{ rating: number; comment?: string }`; highlight metadata is encoded as readable comment text.

## Implementation Plan

1. Add RED-first tests for a review presenter/helper module and the composed route-loading action.
2. Extend `review-screen-actions.ts` with a typed screen-data loader, runtime payload validation, public-safe provider fallback, and request-wiring assertions while preserving `submitReview`/`loadBookingReviews` compatibility.
3. Add review presentation helpers for rating labels, highlight selection, and comment composition.
4. Repair `app/review.js` to use `useSession`, canonical token resolution, auth redirect, route-param validation, the real exported actions, duplicate-review detection, retry, and close navigation.
5. Rebuild `review-screen.js` against `design/review_rating/screen.png`, using only existing React Native/UI primitives and an explicitly local-only photo demo state.
6. Run targeted tests, product tests, workspace type-check, Expo web export, and the repository's actual CI command sequence.
7. Self-review the diff against the acceptance criteria and record any unrelated workflow/CI cleanup as a separate Issue Draft rather than expanding this feature.

## Edge cases / failure handling
- Missing or blank booking id: recoverable route error.
- Missing/expired session token: clear session and redirect to auth.
- Booking is not completed: explain that reviews unlock after completion.
- Provider is private, missing, or malformed: render a neutral provider fallback; do not use booking-scoped vehicle/contact data.
- Existing review by the current role: render the submitted state and prevent a duplicate CTA.
- Comment remains optional; highlights alone produce a valid comment.
- Photo demo state never crosses the API boundary.

## Rollback considerations
Frontend-only and additive except for replacement of the broken `/review` route/screen. Reverting the route, screen, helper, and tests restores the previous state; no data migration or API rollback is required.

## Verification commands
```sh
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-review-flow-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

No lint command exists in the repository.

## Execution Evidence
- RED proof: the focused review tests initially failed because the presenter module and `loadReviewScreenData` did not exist.
- GREEN proof: 19 focused review tests passed; the complete product-app suite passed with 269 tests.
- Workspace proof: all 12 typechecked workspace projects passed.
- CI proof: background-worker build, platform-api tests (334 passed, 3 skipped), admin-web tests (46 passed), admin-web build, and platform-api build passed.
- Bundle proof: Expo web export completed successfully and resolved the JavaScript route imports.
- Live proof: the exported app completed customer authentication, booking/provider loading, form interactions, submission, success, and existing-review reopening against the local in-memory API.
