---
description: Execute a development plan (Issue-first, test-aware)
argument-hint: [branch] [plan-file-path]
---

# Execute Development Plan

## Inputs
`$ARGUMENTS` should contain:
- `<branch>` (e.g. `feature/123-short-slug`)
- `<plan-file-path>` (e.g. `.agent/plans/123-short-slug.md`)

If only one value is provided, treat it as the plan path and derive a branch name from the plan (⚠️ assumption).

## Non-negotiables
- Do NOT create or maintain TASK.md/TODO.md log dumps.
- Track progress via GitHub Issue comments when possible; otherwise provide a concise progress log in your response.

## Step 1) Load context
1) Read `.agent/rules/00-core.md` (canonical) if it exists.
2) Read the plan file.
3) Identify the Issue ID and Acceptance Criteria from the plan.
4) **Hybrid-Light spec gate (#176):** confirm the plan has enough spec/AC detail to prove completion. If not, stop and produce an issue draft or plan update before coding.
5) **Hybrid-Light TDD gate (#176):** classify the selected slice as `risky-logic` or `low-risk/docs`. For `risky-logic`, identify the failing test/contract check to run before implementation.

If the plan does not contain an Issue reference:
- Output an Issue Draft first, then continue.

## Step 2) Prepare branch (propose commands)
Propose (do not auto-run) the exact commands to:
- confirm status
- create/switch to the branch
- sync with base branch (as per repo rules)

## Step 3) BUILDING-Loop: Implement in iterations

## Mode-switch policy (Track C / #51)
Use this rule before implementation starts:
- Prefer **`execute`** when task is bounded, low ambiguity, and can be completed in <=2 slices.
- Switch to **`ralph-loop`** when task is cross-domain, high ambiguity, or expected to need >2 iterations with fresh re-orientation.
- If complexity grows mid-run (new blockers/threads), stop and migrate to `ralph-loop` explicitly.

Each iteration starts with **fresh context loaded from files** — do not rely on prior chat context.

### Per-iteration lifecycle
1. **Orient** — re-read `specs/*` (requirements) + `IMPLEMENTATION_PLAN.md` fresh
2. **Select** — pick the highest-priority incomplete task from the plan
3. **Investigate** — read relevant `/src` files for the selected task (never assume "already implemented")
4. **Implement** — make the minimal change for the selected task only
   - If slice is `risky-logic`: write/identify failing test or contract check first, run it, then implement RED-GREEN-REFACTOR.
   - If slice is `low-risk/docs`: document the substitute proof (diff review, render smoke, asset parity, etc.).
5. **Validate** — run repo-native checks (lint / type-check / tests) per `00-core.md`
6. **Context Guard gate** — run `.agent/workflows/context-checkpoint.md` logic if present:
   - L1 (>=55% pressure): summarize and continue
   - L2 (>=70% pressure): summarize + trim stale context
   - L3 (>=85% pressure): split task / pause / delegate
7. **Update plan** — mark task done; note any discoveries or new sub-tasks
8. **Update `AGENTS.md`** — if operational learnings emerged (new constraints, patterns, gotchas)
9. **Commit** — atomic commit: `<type>: <summary> (#<issue>)`
10. **Next iteration** — treat context as fresh; repeat from step 1 for next task

### Loop termination
Stop when all tasks in `IMPLEMENTATION_PLAN.md` are marked done and validation passes.

### Backpressure
If validation fails, fix before proceeding to the next task. Do not accumulate broken states across iterations.

## Step 4) Verification and Review Gate
Propose the repo-appropriate validation commands (prefer existing scripts):
- lint / format check
- type-check
- tests (unit/integration/e2e as needed)
- build

Record results (pass/fail + highlights), including:
- Acceptance-criteria evidence.
- TDD evidence for `risky-logic`, or why TDD did not apply.
- **Hybrid-Light review gate (#176):** self-review for small low-risk changes; fresh review agent/subagent or explicit code-review workflow for risky/larger changes. Do not mark done/merge-ready until the review result is recorded.

## Step 5) Commit
- Ensure commits reference the Issue.
- Prefer atomic commits per logical slice.
- If this branch will close an issue on merge, ensure PR body later includes `Fixes #<id>`.

## Step 6) Output
Return:
- Summary of changes
- Files touched
- Verification results + commands to reproduce
- Follow-ups / new issues discovered (as Issue Drafts)

## Step 7) Post-PR: CodeRabbit + CI Review Loop (required)

After opening a PR, do **not** stop. Run `.agent/workflows/review-pr.md` to:

1. Check CI status — fix any failures on the same branch.
2. Read CodeRabbit feedback — address all actionable comments.
3. Re-push until CI is green and no actionable CodeRabbit feedback remains.

Rationale: reviewers should not be expected to merge PRs with unresolved CI failures or meaningful CodeRabbit feedback. Agents own the feedback loop through completion.
