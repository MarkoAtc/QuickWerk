# Plan — quickwerk-pr3-mustfix-week-plan-2026-03-26

## Workflow Phase: PRIME

### Context loaded
- Repo baseline and delivery history reviewed from:
  - `README.md`
  - `.agent/plans/draft-qw-core-vslice-implementation-plan.md`
  - `.agent/reports/execution-reports/2026-03-20-prime-audit-quickwerk.md`
  - root `package.json`
- Active mission interpreted as **PR#3 must-fix closure plan** split into safe weekly batches.

### Assumptions (to confirm in kickoff)
- PR#3 includes currently open must-fix comments spanning runtime reliability, UX correctness, and token/session cleanup.
- This week target is **plan + execution-ready batching**, not merge by default.
- Owners below are role-based placeholders if exact assignee names are still pending.

---

## Workflow Phase: PLAN-FEATURE

## Issue
- `PR#3 must-fix execution kickoff (weekly split)`

## Branch
- `fix/pr3-mustfix-week-batches`

## Plan file path
- `.agent/plans/quickwerk-pr3-mustfix-week-plan-2026-03-26.md`

## Goal (this week)
Close PR#3 must-fix items in a low-risk sequence with explicit validation gates and merge-governance, while lining up Option-2 and Option-3 as non-blocking follow-ups.

---

## Batch plan (must-fix)

## Batch 1 — Critical runtime bugs (highest priority)

### Scope
1. Fix crash/throw paths and non-recovering runtime states in product-app/platform-api touched by PR#3.
2. Ensure fallback behavior is deterministic (no silent undefined state transitions).
3. Add/repair regression tests around each fixed runtime defect.

### Deliverables
- Runtime bugfix commits grouped by defect class (API error handling, null/shape guards, state transition guards).
- Added tests proving failure paths now degrade safely.

### Validation gates (must pass before Batch 2)
- Gate B1.1: `corepack pnpm --filter @quickwerk/product-app test`
- Gate B1.2: `corepack pnpm --filter @quickwerk/platform-api test`
- Gate B1.3: `corepack pnpm check`
- Gate B1.4: Manual smoke of impacted runtime path(s) (happy + failing API scenario) documented in PR notes.

### Owner / ETA / blockers
- Owner: Backend + App engineer pair (recommended single DRI + reviewer)
- ETA: Day 1–2
- Known blockers:
  - Exact PR#3 comment map may be incomplete until latest review sync
  - Potential flaky tests in shared CI runner

---

## Batch 2 — UX defects (after runtime stability)

### Scope
1. Resolve UI defects flagged in PR#3 (state messaging, disabled states, route affordances, accessibility labels/testIDs).
2. Keep behavior contract stable (no architectural expansion).
3. Ensure UX fixes are tied to deterministic component tests where practical.

### Deliverables
- UX defect fixes in `apps/product-app` (and admin-web only if directly in PR#3 scope).
- Updated tests/snapshots for adjusted UX states.

### Validation gates (must pass before Batch 3)
- Gate B2.1: `corepack pnpm --filter @quickwerk/product-app test`
- Gate B2.2: Targeted manual UX checklist pass (empty/error/loading/authenticated variants)
- Gate B2.3: Accessibility sanity check on changed controls (labels/state attributes still present)
- Gate B2.4: No new TODO/FIXME placeholders introduced for must-fix paths

### Owner / ETA / blockers
- Owner: Frontend engineer (DRI) + QA reviewer
- ETA: Day 3
- Known blockers:
  - Reviewer interpretation differences on UX severity vs must-fix threshold
  - Potential cross-platform styling variance (web vs native)

---

## Batch 3 — Token/session cleanup + integration hygiene

### Scope
1. Clean token/session handling inconsistencies linked to PR#3 concerns.
2. Remove dead/duplicated auth token glue left by interim scaffolding.
3. Confirm no insecure default path remains in changed areas.

### Deliverables
- Unified token/session boundary handling in touched modules.
- Removal of stale code paths no longer used after cleanup.
- Regression tests for expiry/invalid-token fallback behavior.

### Validation gates (must pass before merge decision)
- Gate B3.1: `corepack pnpm --filter @quickwerk/platform-api test`
- Gate B3.2: `corepack pnpm --filter @quickwerk/product-app test`
- Gate B3.3: `corepack pnpm --filter @quickwerk/platform-api typecheck`
- Gate B3.4: `corepack pnpm check`
- Gate B3.5: Manual session lifecycle smoke (valid session, expired session, invalid token)

### Owner / ETA / blockers
- Owner: Backend auth/session DRI
- ETA: Day 4
- Known blockers:
  - Env-specific auth/session config drift
  - Missing fixture parity for edge expiry timing in tests

---

## Nice-to-have sequencing (non-blocking)

## Option-2 — Provider partner view sequencing
- Position: **after Batch 2, before final polish OR next sprint if Batch 1–3 consume full week**.
- Purpose: expose partner-facing provider view continuity without blocking PR#3 must-fix closure.
- Safe sequence:
  1. Freeze PR#3 must-fix scope first (no mixed feature+fix commits).
  2. Create separate branch: `feature/provider-partner-view-sequencing`.
  3. Reuse stable session/booking contracts from Batch 3 cleanup.
  4. Add minimal read-only partner view first; defer write/actions if risk emerges.

## Option-3 — CI baseline uplift sequencing
- Position: **parallel prep during week, enforce after PR#3 merge decision**.
- Purpose: reduce regressions by introducing consistent baseline checks.
- Safe sequence:
  1. Inventory existing CI parity gaps (`test/typecheck/build` across workspaces).
  2. Add baseline job matrix with non-flaky subset first.
  3. Mark unstable suites as informational initially; promote to required once stabilized.

---

## Workflow Phase: VALIDATE-SIMPLE (planned gates)

Validation command baseline discovered from current repo tooling:
- Root: `corepack pnpm check`
- Service/app scoped tests + typecheck via package scripts (product-app/platform-api)

Execution mode for this artifact:
- ✅ Validation gates defined per batch
- ⚠️ Commands not executed yet in this planning pass (execution session will record real pass/fail)

---

## Merge criteria (explicit go / no-go)

## GO (all required)
1. All Batch 1–3 validation gates pass in latest branch head.
2. Every PR#3 must-fix comment is resolved or explicitly dispositioned by reviewer.
3. No high-severity runtime or auth/session regression remains open.
4. Diff scope remains must-fix bounded (Option-2/3 work kept separate unless explicitly approved).
5. At least one reviewer approves after latest fixes.

## NO-GO (any one triggers hold)
1. Any Batch gate fails (tests/typecheck/check/manual smoke).
2. New runtime crash path introduced by fixset.
3. Session/token handling still inconsistent across touched flow.
4. Scope creep: partner view/CI uplift mixed into must-fix branch without approval.
5. Unresolved blocker marked critical by DRI/reviewer.

---

## Week execution map (proposed)
- Day 1–2: Batch 1 critical runtime bugs + gates
- Day 3: Batch 2 UX defects + gates
- Day 4: Batch 3 token/session cleanup + gates
- Day 5: Reviewer turnaround, merge go/no-go decision, and Option-2/3 handoff prep
