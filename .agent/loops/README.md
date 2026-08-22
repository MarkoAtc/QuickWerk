---
id: ados-loops-readme
name: ADOS Loops
version: 0.1.0
status: experimental
category: orchestration
---

# ADOS Loops

`.agent/loops/` contains durable orchestration contracts for how ADOS workflows compose over time.

A loop is not an executable workflow command. It is a Markdown-first artifact that describes the workflow chain, gates, retry/revision behavior, checkpoint/resume contract, and termination conditions for a repeatable delivery session.

## Artifact boundary

| Artifact | Definition | Path |
|---|---|---|
| Workflow | Executable single-command contract used by an agent interface | `.agent/workflows/*.md` |
| Loop | Orchestration contract that composes workflows over time | `.agent/loops/*.md` |
| Plan | Issue-specific implementation contract and validation plan | `.agent/plans/*.md` |
| Report | Evidence, validation, review, checkpoint, or handoff output | `.agent/reports/**/*.md` |
| Spec | Product, behavior, or system source material | `specs/*.md` |

## Required loop sections

Every loop artifact should include:

1. Purpose
2. Inputs
3. Trigger modes
4. Workflow chain
5. Gate rules
6. Retry/revision budget
7. Checkpoint/resume contract
8. Artifact map
9. Human approval / escalation points
10. Termination conditions
11. Non-goals

## Metadata

Loop files should use YAML frontmatter so future tooling can inspect them without parsing prose.

Recommended fields:

```yaml
---
id: ados-core-delivery-loop
name: Core Delivery Loop
version: 0.1.0
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
  - code-review
  - close
---
```

## Current execution model

Loops are currently agent-guided documentation artifacts. There is intentionally no `ados loop run` command in this slice.

Agents execute the workflows listed in a loop, write the required reports/checkpoints, and use the loop gate rules to decide whether to proceed, revise, re-plan, escalate, or stop.
