# Plan — #71 Admin Dashboard Desktop Parity

## Goal

Recompose the admin operator cockpit into the approved desktop dashboard direction while preserving every existing operator session, provider-review, dispute, and finance-exception workflow.

## Delivery Contract

- **Issue:** [#71](https://github.com/MarkoAtc/QuickWerk/issues/71)
- **Parent roadmap:** [#55](https://github.com/MarkoAtc/QuickWerk/issues/55)
- **Branch:** `codex/feature/71-admin-dashboard-parity`
- **Plan:** `.agent/plans/71-admin-dashboard-parity.md`
- **Risk/TDD classification:** risky UI composition because the route owns server-action wiring for operational queues. RED proof: extract a pure dashboard presentation contract (metric and queue-section composition) with failing tests before changing the route shell. GREEN proof: the contract and existing queue action/state tests pass while the route retains the same server-action inputs and revalidation behavior.

## Acceptance Criteria

- [ ] The root admin route has a desktop sidebar, overview header, metric cards, and queue sections aligned with `design/admin_dashboard_desktop`.
- [ ] Provider verification, disputes, finance exceptions, and operator session behavior retain their current APIs, action inputs, errors, and revalidation behavior.
- [ ] Presentation is decomposed into focused dashboard components without duplicating existing queue state/action logic.
- [ ] The dashboard has no horizontal page overflow at 1024px and 1440px.
- [ ] Admin tests, type-check, production build, and focused browser QA pass.

## Validation Contract

### Assertions (written before implementation)

- [ ] The dashboard presenter exposes only derived display data; it does not create metrics or queue data that lack an existing source.
- [ ] Existing verification decision, dispute transition, and finance-exception triage action tests remain green unchanged.
- [ ] The server actions preserve their current accepted form fields and call `revalidatePath('/')` after a successful mutation.
- [ ] The admin page has no horizontal overflow at 1024px and 1440px, and all queue sections remain reachable.
- [ ] `pnpm check`, the admin test suite, and the admin production build pass.

### Performance bounds

- No new API requests or polling. Dashboard data load count and server-action request sequence remain unchanged.

### Interface Contracts

- Existing operator-session resolution and queue action modules are reused unchanged unless a regression test proves a necessary correction.
- Existing server-action form names/values for verification, dispute, and finance triage remain unchanged.

## Implementation Slices

1. **Inventory and RED proof.** Map existing `page.js` sections and the desktop design reference; add a failing pure dashboard-composition test for sourced metric/queue presentation.
2. **Shell and overview.** Introduce focused dashboard shell/header/metric components using only current presenter summaries and explicit unavailable states—no fabricated operational metrics.
3. **Queue composition.** Extract provider verification, dispute, and finance sections into focused components. Keep server actions in the route and pass the existing state/action contracts through unchanged.
4. **Desktop QA.** Verify 1024px and 1440px layouts, queue reachability, errors, and action controls. Run the repository validation and review gates; record evidence.

## Likely Touch Points

- `apps/admin-web/src/app/page.js`
- `apps/admin-web/src/features/dashboard/dashboard-presenter.ts`
- `apps/admin-web/src/features/dashboard/dashboard-presenter.test.ts`
- New focused components under `apps/admin-web/src/features/dashboard/`
- `.agent/reports/**` delivery evidence

## Out of Scope

- Operator authorization, backend endpoints, queue state/action modules, financial policy, product-app surfaces, and messenger.

## Rollback

Revert the issue commits. No API, schema, session-policy, or persistence changes are planned.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: #71 acceptance criteria, desktop design reference, and validation contract
- Remaining gaps: implementation, validation, review, and PR
- Next action: begin the RED presentation-contract test in the #71 worktree
