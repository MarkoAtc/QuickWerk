# Plan — #69 Provider Workspace and Payout Responsiveness

## Goal

Make the provider workspace (`/provider`) and payout history (`/payouts`) readable and operable from 320px mobile screens through wide web layouts, without changing their existing session, navigation, or API behavior.

## Delivery Contract

- **Issue:** #69 — Audit and repair provider workspace and payout responsiveness
- **Branch:** `codex/fix/69-provider-workspace-payout-responsive`
- **Plan:** `.agent/plans/69-provider-workspace-payout-responsive.md`
- **Risk/TDD classification:** risky UI composition logic. RED proof: extend the provider layout-policy tests to require phone-safe request action and payout summary directions. GREEN proof: policy returns those values for each responsive mode.

## Acceptance Criteria

- [ ] `/provider` has no horizontal overflow at 320, 360, 390, 430, and 1024px widths.
- [ ] Provider booking actions stack on phone layouts and retain the existing accept/decline behavior.
- [ ] `/payouts` has no horizontal overflow at the same widths; payout amount and status do not compete for a single narrow row.
- [ ] Existing provider dashboard loading, session redirect, navigation, and payout load behavior remain unchanged.
- [ ] Product app checks, web export, and focused browser QA pass.

## Validation Contract

### Assertions (written before implementation)

- [ ] The shared provider layout policy resolves `requestActionDirection` and `payoutSummaryDirection` to `column` at 320–430px and `row` at 1024px.
- [ ] Provider request controls remain available and callable after the layout change.
- [ ] Payout loading, error, empty, and loaded states keep their existing action/state contracts.
- [ ] `pnpm check` completes successfully.
- [ ] CI-equivalent tests and builds complete successfully.
- [ ] Expo web export completes successfully, and `/provider` and `/payouts` show no horizontal overflow at 320, 360, 390, 430, and 1024px.

### Performance bounds

- N/A — the change is presentation-only and adds no network calls, polling, or data processing.

### Interface contracts

- Existing provider dashboard booking endpoints and payout-fetch endpoint are unchanged.
- Existing Expo routes `/provider` and `/payouts`, session redirects, and navigation targets remain unchanged.

## Implementation Slices

1. [x] Add RED layout-policy expectations for provider request actions and payout summaries; implement the minimal policy values and verify GREEN.
2. [x] Consume the policy in the provider dashboard header, content gutter, and request action group while preserving action handlers and accessibility state.
3. [x] Consume the policy in payout screen content and payout-card heading while preserving all existing loading/error/empty states.
4. [x] Run focused unit tests, product-app tests, full CI-equivalent validation, Expo web export, and browser QA. Record review and validation evidence.

## Rollback

Revert this issue’s single commit; no database, API, or persisted data changes are involved.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: RED/GREEN responsive policy test, CI-equivalent validation, Expo web export, and authenticated 320px browser QA
- Remaining gaps: post-PR CI and CodeRabbit feedback loop
- Next action: commit and open the PR
