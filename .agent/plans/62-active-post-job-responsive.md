# Issue #62 — Active and post-job route responsiveness

## Issue

[#62 — Audit and repair active/post-job customer route responsiveness](https://github.com/MarkoAtc/QuickWerk/issues/62)

Parent roadmap: [#55 — Roadmap: complete mobile-first responsiveness and remaining UI migration](https://github.com/MarkoAtc/QuickWerk/issues/55)

## Goal

Make the active and post-job customer journey usable from 320px phones through wide web layouts. Reuse the responsive baseline shipped under #56 and retain the existing route behavior: active booking status/tracking, provider identity/contact, checkout/completion handoffs, completed-booking invoice/review/dispute controls, and the dedicated review submission flow.

## Execution contract

- **Branch:** `codex/fix/62-active-post-job-responsive`
- **Plan:** `.agent/plans/62-active-post-job-responsive.md`
- **Classification:** `risky-logic` — the affected presentation surrounds authenticated lifecycle operations and route handoffs. It must not change booking status, API requests, payment policy, review/dispute payloads, session behavior, or navigation.
- **RED proof:** first add focused tests for a pure active/post-job layout policy that fails before the policy exists. Cover phone, compact, wide, and invalid-width decisions for hero typography, content padding, summary rows, tracking content, provider identity/actions, rating controls, and review chips.
- **GREEN proof:** the policy tests plus existing continuation, completion, review state/action/presenter tests, product suite, type-check, Expo export, CI-equivalent checks, and browser viewport matrix pass.

## Route-group inventory

| Route | Current behavior to preserve | Responsive audit focus |
|---|---|---|
| `/active-job` | Auth redirect/session boundary; continuation loading/error/retry; status timeline; optional tracking, provider identity and phone call; messaging; pay-now handoff; completed booking handoff | 42px hero, fixed-height map overlays, tracking headline/distance row, two information cards, provider identity/rating, long service/provider/vehicle text, and stacked action reachability |
| `/booking-completion` | Auth/session boundary; loading/error/empty states; route back to active job; invoice/payment rendering; inline review submission and dedicated review handoff; dispute validation/submission; refresh | 42px hero, two summary metrics, five rating controls, review/dispute form text, category controls, long feedback/status history, and error/empty states |
| `/review` | Auth/session boundary; completed-booking data loading/error/retry; existing-review recognition; rating/highlight/comment/local photo-toggle state; review POST; return to completion | Header/close affordance, 96px avatar, five 52px stars, wrapping chips, long provider/service copy, text-area counter, photo row, success/error states, and submit reachability |

### Explicitly out of scope

- Provider onboarding/profile/payout routes, messenger, public/secondary routes, and admin web.
- Any new live map, tracking source, chat capability, payment flow, review media upload, pricing calculation, invoice behavior, dispute policy, backend/API-client contract, auth policy, or persistence change.
- Visual redesign beyond evidence-backed responsiveness repairs; `design/live_job_tracking` and `design/review_rating` remain visual references, not a license to invent capabilities.

## Existing patterns to follow

- Reuse `resolveResponsiveLayout` and `useResponsiveLayout`; do not define a separate breakpoint system or dimension listener.
- Follow the pure feature-local policy shape used by `src/shared/customer-booking-layout.js`, but name/locate the new policy for this route group (for example `src/shared/active-post-job-layout.js`).
- Keep `ProductScreenShell` for route-level loading, error, and empty states. Keep app route files responsible for session/state/navigation orchestration.
- Keep `ActiveJobScreen`, `BookingCompletionScreen`, and `ReviewScreen` as presentation components; do not move lifecycle behavior into them.
- Preserve existing test IDs and accessibility roles/labels unless a replacement keeps the same observable contract.

## Likely touch points

### Existing files

- `apps/product-app/app/active-job.js`
- `apps/product-app/app/booking-completion.js`
- `apps/product-app/app/review.js`
- `apps/product-app/src/features/booking/active-job-screen.js`
- `apps/product-app/src/features/booking/booking-completion-screen.js`
- `apps/product-app/src/features/booking/review-screen.js`
- `apps/product-app/src/shared/responsive-layout.js` only if a reusable baseline value is demonstrably missing
- Existing focused tests under `apps/product-app/src/features/booking/`
- `docs/planning/13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`

### Expected new files

- `apps/product-app/src/shared/active-post-job-layout.js`
- `apps/product-app/src/shared/active-post-job-layout.test.js`
- `.agent/reports/loops/62-core-delivery-loop/checkpoint.md`
- `.agent/reports/validation/62-active-post-job-responsive.md`
- `.agent/reports/code-reviews/62-active-post-job-responsive.md`
- `.agent/reports/execution-reports/62-active-post-job-responsive.md`

The executor may use a narrower feature-local filename when it produces clearer ownership; it must remain a pure, tested derivation from the shared responsive contract.

## Acceptance criteria

- [ ] The three routes are delivered as one bounded #55 child slice, reuse the existing responsive contract, and add no dependency or parallel breakpoint system.
- [ ] `/active-job` keeps its status, hero, map/tracking content, timeline, provider identity/contact, service/counterpart information, payment/contact/refresh actions, and status history readable and vertically reachable at all supported widths.
- [ ] `/booking-completion` keeps loading/error/empty states, hero/summary, invoice/payment copy, inline review controls, dedicated-review handoff, dispute form, feedback, history, and refresh controls usable without collisions or horizontal overflow.
- [ ] `/review` keeps loading/error, the complete form, existing-review success state, long text, rating, highlights, comment, local photo toggle, error, and submit/close controls usable and accessible at all supported widths.
- [ ] Auth redirects, missing-token sign-out behavior, `bookingId` parameter semantics, and all existing route handoffs remain unchanged.
- [ ] No changes occur to tracking/provider/review/dispute/payment API requests, request bodies, authorization, pricing, invoice behavior, simulated-payment behavior, or data retention.
- [ ] Long requested-service/provider/vehicle/invoice/review/dispute/error/status text wraps without hiding actions; controls remain at least 44px where the existing design permits.
- [ ] Focused RED/GREEN tests cover the policy. Existing continuation, completion, review, and state/action/presenter tests remain green.
- [ ] Browser QA at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900` finds no page-level horizontal overflow, clipped controls, unreadable wrapping, or inaccessible primary action.
- [ ] Product tests, workspace type-check, Expo web export, and CI-equivalent checks pass; validation, review, execution, and roadmap evidence are persisted.

## Validation Contract

### Assertions (written before implementation)

- [ ] Widths `320`, `360`, `390`, and `430` resolve to phone-safe content gutters, hero typography, card padding, and vertical/stacked compositions where row content would otherwise collide.
- [ ] Compact and `1024` wide layouts are intentional; missing, non-finite, zero, and negative widths fail closed to phone-safe decisions.
- [ ] Active-job map badges and tracking headline/distance have a phone-safe composition; the map overlay does not cover required content and long status labels remain readable.
- [ ] Active-job information cards and provider identity content stack/wrap before long service, provider, vehicle, plate, or rating text causes clipping; contact, pay, message, and refresh actions stay reachable.
- [ ] Completion summary metrics, five rating buttons, review/dispute controls, long invoice/detail text, feedback, status history, and refresh action remain vertically reachable and do not overflow.
- [ ] Review header, stars, highlight chips, comment input/counter, local photo row, success card, error text, submit, and close action remain readable and operable; keyboard focus does not hide the relevant submit action.
- [ ] Loading, error, and empty route states continue to use the responsive shared shell and preserve retry/back-to-active-job actions.
- [ ] `bookingId` stays present through `/active-job`, `/booking-completion`, and `/review` handoffs; completed/unaccepted/payment handoffs retain their current targets.
- [ ] Existing `loadBookingContinuation`, `loadBookingCompletion`, `loadReviewScreenData`, `submitBookingCompletionReview`, `submitBookingCompletionDispute`, and `submitReview` inputs, payloads, and outcomes are unchanged.
- [ ] Existing responsive, active-job, completion, review route-state/action/presenter tests pass unchanged unless an assertion is deliberately strengthened without changing behavior.
- [ ] `pnpm --filter @quickwerk/product-app test` and `pnpm check` pass with zero failures/errors.
- [ ] Expo web export resolves every modified route/import.
- [ ] Browser checks report `scrollWidth <= clientWidth`, no unexpected console/page errors, and accessible primary controls at every required viewport.
- [ ] All CI-equivalent tests and builds pass.

### Performance bounds

- Responsive layout resolution is constant-time and pure: no I/O, polling, timers, extra listeners, or traversal proportional to history/reviews.
- The layout work adds zero continuation, tracking, provider, invoice, review, dispute, or payment requests.
- Existing duplicate-submit guards for review and dispute remain effective.

### Interface contracts

- No backend, API-client, domain, authentication, authorization, persistence, payment, invoice, review-media, dispute, pricing, or data-retention contract changes.
- `ActiveJobScreen`, `BookingCompletionScreen`, and `ReviewScreen` retain their existing props and callbacks unless a backwards-compatible presentation-only optional prop is necessary.
- Routes and parameters remain unchanged: `/active-job`, `/booking-completion`, and `/review` continue to use `bookingId` with its current meaning.
- `ProductScreenShell`, `resolveResponsiveLayout`, and `useResponsiveLayout` remain the shared shell/breakpoint boundary.

## Implementation plan

1. **Capture RED evidence.** Record the route inventory and add failing pure-layout tests before creating the policy. Keep the #55 roadmap open and reference it—not fix it—from the child PR.
2. **Add a route-group layout policy.** Derive phone/compact/wide values from `resolveResponsiveLayout` for gutters, bounded display sizes, card padding, action minimum height, map/tracking composition, summary direction, rating/chip wrapping, and bottom action spacing.
3. **Repair active-job presentation.** Apply the policy to content width/padding, hero, map badges/tracking overlay, information cards, provider identity/contact, long text, and action stack. Do not alter continuation/tracking/contact/payment handlers or route-state transitions.
4. **Repair booking-completion presentation.** Apply the policy to the hero, summary metrics, invoice copy, inline rating/review controls, dedicated-review entry, dispute form/category options, feedback/history, and refresh action. Preserve submitted/error/empty/loading semantics and API calls.
5. **Repair dedicated-review presentation.** Apply the policy to the header, provider context, star controls, wrap-capable highlight chips, text area/counter, local photo control, success/error states, and submit/close action. Preserve the existing review payload composition and return navigation.
6. **Strengthen interface regression coverage.** Keep action/route-state tests as the source of truth for request and navigation behavior; add only focused assertions needed to prove responsive composition has not changed those interfaces.
7. **Update tracking evidence.** Change the roadmap inventory status from future to its new child issue/PR only after the work ships; persist loop, validation, review, and execution reports. Keep later #55 route groups explicitly deferred.
8. **Run verification and delivery gates.** Capture RED/GREEN, run focused tests, product tests, workspace type-check, Expo export, CI-equivalent checks, `git diff --check`, and browser QA. Run a fresh review, commit, open a PR that fixes the child issue and references #55, then follow the post-PR review loop until CI and actionable feedback are clear. Do not merge.

## Browser QA matrix

| Route/state | Required checks |
|---|---|
| `/active-job` loading/error | Responsive shell, retry, long error text, and no clipped controls |
| `/active-job` accepted/en-route | Hero, map badges/overlay, long tracking headline and distance, timeline, provider identity/contact, service/counterpart, pay/message/refresh actions |
| `/active-job` completed or payment handoff | Existing navigation target and `bookingId` preservation; no altered lifecycle behavior |
| `/booking-completion` loading/error/empty | Shell, retry, long error, current-status copy, and active-job return action |
| `/booking-completion` completed/long content | Hero, summary, invoice/payment details, five stars, review/dispute form, feedback, history, dedicated review, and refresh |
| `/booking-completion` review/dispute failures | Validation/error/submitting feedback remains distinct and actions are reachable without duplicate requests |
| `/review` loading/error/existing review | Shell, retry/close, header, success state, and return to completion |
| `/review` new review/long content | Provider/service copy, stars, highlight wrapping, 500-character comment/counter, photo toggle, submission/error, close/submit reachability |

Run normal states at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900`. Exercise error, handoff, and longest-content states at least at `320x640` and `1024x900`; use controlled API fixtures only to make states deterministic, never to bypass the UI contracts.

## Edge cases and failure handling

- Long service/provider/vehicle/license-plate, status, tracking, payment/invoice, review, dispute, and error strings must wrap or stack rather than cause clipping.
- Active-job map stage must retain a usable overlay hierarchy even with longer status text or at the smallest phone width.
- Completion's five rating controls and review's five 52px stars must remain individually operable at 320px.
- Highlight chips may wrap to additional rows, and the comment character counter must remain inside its input boundary.
- Keyboard pressure while entering review/dispute copy cannot leave the submit action permanently inaccessible; vertical scrolling remains available.
- Viewport changes cannot reset route-state, chosen rating, comment/highlights/photo toggle, dispute category/description, loading, feedback, or submission guards.
- Request failures stay recoverable as existing retry/error states; responsive work introduces neither automatic retries nor duplicate submissions.

## Rollback

Frontend presentation, pure policy tests, and planning/report documentation only. Reverting those changes restores the previous layout without database, API, auth, payment, review, dispute, or deployment rollback.

## Verification commands

```sh
pnpm --filter @quickwerk/product-app exec vitest run src/shared/active-post-job-layout.test.js src/shared/responsive-layout.test.js src/features/booking/active-job-route-state.test.ts src/features/booking/active-job-presenter.test.ts src/features/booking/active-job-screen-actions.test.ts src/features/booking/booking-completion-route-state.test.ts src/features/booking/booking-completion-presenter.test.ts src/features/booking/booking-completion-screen-actions.test.ts src/features/booking/review-screen-actions.test.ts src/features/booking/review-screen-presenter.test.ts src/features/booking/review-state.test.ts
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-62-active-post-job-web
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
git diff --check
```

The repository has no lint command. Focused browser QA is required in addition to these checks.

## Prime Summary

- **Stack/tooling:** Node 20+/TypeScript pnpm workspace; Expo Router/React Native product app; Vitest product tests; `pnpm check` for workspace type-checking; Expo web export plus browser QA for route changes.
- **Key modules:** route orchestration lives in `apps/product-app/app`; booking presentation/state/actions live in `apps/product-app/src/features/booking`; responsive primitives live in `apps/product-app/src/shared`.
- **Patterns:** existing routes use `ProductScreenShell` for terminal/loading states and `resolveResponsiveLayout`/`useResponsiveLayout` for responsive work. #60 establishes a pure, tested route-group policy precedent.
- **Hazards:** the route group sits on authenticated booking lifecycle actions and has pre-existing unrelated worktree changes. Preserve both the lifecycle contracts and unrelated changes.
- **Suggested next workflow:** `execute`; #62 now supplies the bounded completion target that #55 intentionally lacks as a roadmap tracker.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: issue #62 has explicit route boundaries and acceptance criteria; parent #55 has the responsive roadmap contract; source/design/pattern inspection is complete; this plan includes a Validation Contract, scoped steps, and reproducible verification commands.
- Remaining gaps: RED/GREEN proof, implementation, browser matrix, validation, review, commit, PR, CI, and post-PR review feedback are intentionally unstarted.
- Next action: run `.agent/workflows/execute.md` with `codex/fix/62-active-post-job-responsive .agent/plans/62-active-post-job-responsive.md`.
