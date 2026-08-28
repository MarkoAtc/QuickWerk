---
id: ados-core-delivery-loop
name: Core Delivery Loop
version: 0.2.0
status: experimental
category: orchestration
scope: issue-delivery
triggers:
  - manual
  - issue
required_workflows:
  - prime
  - plan-feature
  - execute
  - validate-simple
  - review-pr
  - create-pr
  - session-wrap-up
---

# Core Delivery Loop

## Purpose

Coordinate a complete ADOS issue-first delivery run from repository priming through planning, implementation, verification, review, close/PR handoff, and session wrap-up.

The loop makes the delivery sequence resumable and inspectable by defining gates, retry limits, checkpoint artifacts, and termination conditions outside transient chat memory.

## Inputs

Required before starting:

- GitHub Issue ID or complete Issue Draft.
- Target repository path.
- Base branch and feature/fix branch name.
- Plan path or approval to create one under `.agent/plans/`.
- Risk/TDD classification.
- Any product spec, reference prep, or linked design artifact relevant to the issue.

## Trigger modes

| Trigger | Description |
|---|---|
| Manual | A user or orchestrator asks an agent to run the issue-first delivery loop. |
| Issue | A GitHub issue is selected for implementation. |
| Resume | A new session resumes from a loop checkpoint or handoff artifact. |

## Workflow chain

1. `prime`
   - Load repository rules, current state, issue context, and relevant project memory.
2. `plan-feature <issue-id>`
   - Produce or update the issue-specific plan and validation contract.
3. `execute <branch> <plan-file-path>`
   - Implement the plan in bounded slices.
4. `validate-simple` or `validate`
   - Run repo-native validation appropriate to the risk level.
5. Review gate
   - Review the diff against acceptance criteria, plan contract, and repo conventions.
   - Use a self-review for small `low-risk/docs` changes or a fresh review pass for risky/larger work, then persist findings under `.agent/reports/code-reviews/` when useful.
6. Revise when verify/review fails
   - Fix blockers and rerun the failed gate, bounded by the retry budget.
7. Close gate when acceptance is proven
   - Prepare close evidence or mark the issue blocked/in-review when appropriate.
8. `create-pr`
   - Open or update the PR with summary, test evidence, and issue linkage.
9. Retrospective / system review when triggered
   - Capture process improvements for medium/high-risk or failed-loop work under `.agent/reports/system-reviews/`; a standalone workflow file is optional.
10. `wrap-up` / `session-wrap-up`
   - Clean resources and leave a structured handoff if work continues.

## Gate rules

| Gate | PASS | FAIL | BLOCKED |
|---|---|---|---|
| Plan | Continue to execute. | Revise the plan before implementation. | Escalate missing scope, unclear AC, or missing owner decision. |
| Verify | Continue to review. | Revise implementation and rerun validation. | Escalate missing environment, unavailable service, or external dependency. |
| Review | Continue to close/PR. | Revise implementation and rerun review. | Escalate architectural conflict or contradictory feedback. |
| Close | Create/update PR and final issue evidence. | Produce follow-up issue or re-plan. | Mark issue blocked/in-review with named owner and unblock condition. |

Gate outputs must use the `## Gate Result` block defined in `.agent/rules/00-core.md` for phase-boundary workflows.

Review, revise, close, and retrospective are loop phases, not required standalone workflow files in this repository. The executable workflow dependencies are the files listed in `required_workflows`; phase evidence is persisted using the artifact map below.

## Retry/revision budget

- Maximum revise cycles per failed gate: 2.
- After 2 failed revise cycles: stop and produce RCA, re-plan, or human escalation.
- Do not proceed from Plan to Execute without a plan and validation contract.
- Do not proceed from Verify to Review with failing validation unless the issue is explicitly marked BLOCKED and the blocker is outside agent control.
- Do not close an issue without evidence for each acceptance criterion.

## Checkpoint/resume contract

After every phase boundary, the active agent should leave enough durable state for a new session to resume safely.

Default checkpoint path:

```text
.agent/reports/loops/<issue-id>-core-delivery-loop/checkpoint.md
```

Required checkpoint fields:

- Current phase.
- Last workflow completed.
- Last gate result.
- Branch and PR state.
- Artifacts produced.
- Commands run and results.
- Open blockers or owner decisions needed.
- Next recommended action.

Use `.agent/reports/loops/<issue-id>-core-delivery-loop/handoff.md` for longer handoffs that need the structured schema from `.agent/rules/00-core.md`.

## Artifact map

| Artifact | Path |
|---|---|
| Plan | `.agent/plans/<issue-id>-<slug>.md` |
| Execution report | `.agent/reports/execution-reports/<issue-id>-<slug>.md` |
| Validation report | `.agent/reports/validation/<issue-id>-<slug>.md` |
| Review report | `.agent/reports/code-reviews/<issue-id>-<slug>.md` |
| Loop checkpoint | `.agent/reports/loops/<issue-id>-core-delivery-loop/checkpoint.md` |
| Final handoff | `.agent/reports/loops/<issue-id>-core-delivery-loop/handoff.md` |

## Human approval / escalation points

Escalate or request explicit approval before:

- Destructive commands, history rewrites, production writes, deploys, or data migrations.
- Scope changes that invalidate the plan or acceptance criteria.
- Continuing after retry budget exhaustion.
- Closing an issue with incomplete acceptance evidence.
- Publishing or merging when validation is blocked by missing credentials or unavailable external systems.

## Termination conditions

The loop ends when one of the following is true:

- PR is created/updated and all required gates passed.
- Issue is closed as completed with evidence.
- Work is marked BLOCKED by a named external dependency or owner decision.
- Retry budget is exhausted and an RCA/re-plan/escalation artifact exists.
- Scope changed enough that a new plan is required.
- A safety or destructive-action guardrail stops execution.

## Non-goals

- Do not introduce `ados loop run` in this issue.
- Do not move existing executable workflow files into `.agent/loops/`.
- Do not define the tracepack schema here; that belongs to the trace/evidence workstream.
- Do not implement an autonomous optimizer or hill-climbing engine here.
- Do not replace `.agent/workflows/*`; loops compose workflows, they do not execute as workflows themselves.
