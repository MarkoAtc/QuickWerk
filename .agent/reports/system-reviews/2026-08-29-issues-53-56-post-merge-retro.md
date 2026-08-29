# Retrospective — 2026-08-29 — ADOS Recovery and Mobile Auth Baseline

## Scope and outcome

This delivery sequence restored the repository's operational ADOS contract and established the first enforceable mobile-first UI baseline:

- Issue [#53](https://github.com/MarkoAtc/QuickWerk/issues/53) shipped in PR [#54](https://github.com/MarkoAtc/QuickWerk/pull/54): canonical rules, real validation commands, the post-PR review loop, durable handoff conventions, and GBrain handling are now repository-owned.
- Issue [#56](https://github.com/MarkoAtc/QuickWerk/issues/56) shipped in PR [#57](https://github.com/MarkoAtc/QuickWerk/pull/57): shared responsive layout values now drive the product shell and critical customer/provider auth entry surfaces, with browser evidence across the required viewport matrix.

Both PRs passed CI and CodeRabbit review, were squash-merged in owner-authorized order, and left no open pull requests. Local `main` was then aligned exactly to `origin/main`; the obsolete pre-PR recovery commit was removed from the branch after its content had landed through PR #54.

## What worked well

1. **Direct visual feedback corrected the roadmap at the right level.** The auth-page review exposed a cross-route mobile-first gap rather than an isolated styling defect. Turning that observation into roadmap issue #55 and bounded child issue #56 avoided both dismissal and a whole-app rewrite.
2. **The responsive contract is reusable and measurable.** Required phone widths, overflow/wrapping constraints, bounded typography, and a wider viewport check now form an explicit acceptance matrix instead of relying on subjective “responsive” claims.
3. **Issue-first delivery kept the two concerns separate.** Operational recovery (#53) and product UI remediation (#56) were independently planned, reviewed, validated, and merged.
4. **The post-PR feedback loop produced concrete improvements.** CodeRabbit identified the missing post-open `review-pr` step, an ambiguity around historical handoffs, and the absent plan validation contract. All three were fixed in the PR branch; the two inline threads were automatically marked addressed and resolved.
5. **Merge ordering preserved a clean baseline.** PR #54 landed first, then PR #57 was re-checked as mergeable and landed on top of the restored workflow contract.

## What slowed the work down

1. **The initial local recovery commit was created on `main`.** The PR branch later carried the reviewed/amended version, leaving local `main` with a superseded divergent commit after the squash merge. Cleanup required an explicit, guarded realignment to `origin/main`.
2. **CodeRabbit review capacity was rate-limited after the follow-up push.** The existing findings were still deterministically satisfied and the inline threads auto-resolved, but a fresh full review could not run in the same quota window.
3. **The issue #56 checkpoint stopped at pre-PR state.** The PR/review/merge outcome was durable on GitHub but not reflected in the loop checkpoint until this wrap-up.
4. **The generic Playwright wrapper did not expose its expected CLI.** Browser QA succeeded through the repository's established `.claude/skills/browser-drive` environment, but the tool mismatch added avoidable discovery time.
5. **No standalone `system-review` workflow exists.** The ADOS skill's canonical report contract supplied the fallback path, but the workflow inventory and the intended retrospective entry point are still asymmetric.

## Improvements to carry forward

- Create the issue branch before the first durable implementation or recovery commit; do not use local `main` as a staging branch.
- Treat post-merge local-main synchronization and checkpoint closure as explicit close-gate steps.
- Update roadmap parent checklists when child issues merge so GitHub remains the authoritative queue.
- Reuse `.claude/skills/browser-drive` for the next product-app viewport matrix unless the generic wrapper is repaired.
- Continue using bounded #55 child issues with route lists and viewport evidence; do not reopen mobile responsiveness as a monolithic pass.

## Next-slice guidance

Roadmap issue [#55](https://github.com/MarkoAtc/QuickWerk/issues/55) remains the active tracker. The next recommended child issue is a bounded inventory and remediation slice for primary customer routes. It should:

- inventory the customer route group and classify each route as compliant or needing repair;
- select one coherent route group rather than the entire app;
- reuse the responsive layout contract introduced by #56;
- verify `320`, `360`, `390`, and `430` pixel phone widths plus one wider viewport;
- record overflow, wrapping, scrolling, safe-area, and primary-action evidence.

Provider onboarding/profile, admin dashboard parity, and messenger/secondary surfaces remain sequenced after the primary customer-flow stabilization slices.

## Gate Result

- Gate: Close
- Status: PASS
- Evidence: merged PRs #54 and #57, green CI/CodeRabbit states, resolved review threads, clean synchronized `main`, and this retrospective.
- Remaining gaps: roadmap issue #55 remains intentionally open for bounded child delivery.
- Next action: file the primary customer-route audit/remediation child issue under #55 and run the ADOS core delivery loop.
