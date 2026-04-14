# Handwerker OnDemand AI Agent Instructions and Automation Workflows

## 1. Objective

This document defines how AI assistants may safely accelerate delivery, documentation, QA, and reporting for Handwerker OnDemand without creating compliance, security, or quality risk.

## 2. Allowed AI Task Categories

### Product and planning

- convert approved requirements into epics, stories, and acceptance criteria
- identify missing assumptions and dependency gaps
- draft milestone summaries and status reports

### Engineering

- generate implementation plans for approved tickets
- draft code changes inside existing architectural boundaries
- extract and consolidate duplicated client logic into shared packages where appropriate
- add and improve unit and integration tests
- triage CI failures and propose minimal fixes
- update technical documentation and ADR drafts

### QA and operations

- generate regression checklists
- summarize logs and incident timelines
- draft postmortem and release-note content

## 3. AI Tasks Requiring Explicit Human Approval

- dependency installation or upgrade with material risk
- database schema changes affecting production data migration
- payment provider configuration changes
- security policy changes
- legal text changes
- infrastructure changes that alter production exposure or cost materially
- introducing a separate client framework or independent frontend codebase that fragments the shared product-app strategy
- deletion of significant data or irreversible actions

## 4. Standard AI Workflow

### Step 1: Understand the task

- identify the related planning document and module
- restate assumptions before implementation
- confirm interfaces and symbols before editing
- confirm whether the change belongs in shared code or in a justified platform-specific module

### Step 2: Plan the smallest safe slice

- propose a narrow change plan
- call out risk areas
- choose the smallest useful validation method

### Step 3: Implement

- prefer minimal changes
- preserve naming and conventions already used in the codebase
- update tests and docs with the code change

### Step 4: Validate

- run targeted tests first
- run broader checks only if needed
- summarize exact commands, exit status, and key findings

### Step 5: Handover

- explain what changed
- list assumptions and residual risks
- identify any follow-up work explicitly rather than silently expanding scope

## 5. AI Guardrails

- never fabricate external API behavior; confirm interfaces from source docs or code
- do not bypass payment, auth, or data-retention controls for speed
- do not silently change roadmap commitments
- do not change merchant-of-record assumptions without sponsor approval
- do not claim a feature is complete unless tests and acceptance criteria support it

## 6. Prompting Pattern for Developers

### Preferred input packet

- business context
- target file(s) or module
- acceptance criteria
- validation expectation
- approval boundaries

### Example task framing

- module: Booking lifecycle
- requested change: add provider decline reason tracking
- acceptance criteria: decline reasons saved, exposed to support, analytics event emitted
- validation: unit tests + integration test for API

## 7. PR Review Policy (CodeRabbit)

Every PR in this repo is automatically reviewed by CodeRabbit after each push. Execution agents must not treat "PR opened" as the end of their work.

**Required behavior after opening a PR:**

1. Check CI status — investigate and fix any failures on the same branch.
2. Read CodeRabbit feedback — address all actionable comments (bugs, correctness issues, clear improvements).
3. Re-push until CI is green and no actionable CodeRabbit feedback remains.
4. Only then set the Paperclip issue to `in_review` and stop.

Agents must not wait passively in "in_review" when automated reviewer output creates clear next actions. Detailed steps are in `.agent/workflows/review-pr.md`.

## 8. Automation Workflows

## 7.1 Story decomposition workflow

- ingest approved roadmap milestone
- break into epics and stories
- attach assumptions, dependencies, and test notes
- flag unclear legal/commercial items for human review

## 7.2 Code change workflow

- locate relevant modules
- prefer the shared product-app layer first
- confirm interfaces
- implement minimal change
- isolate platform-specific code only where required
- add tests
- run targeted validation
- summarize results for reviewer

## 7.3 CI failure triage workflow

- classify failure type: lint, test, build, dependency, infra
- identify likely root cause from logs
- propose the smallest corrective action
- rerun only the affected check first

## 7.4 Documentation sync workflow

- detect changed behavior or scope
- update corresponding sections in `01`, `02`, `03`, or `07`
- add changelog note or ADR reference if design changed

## 7.5 Stakeholder reporting workflow

- gather completed tickets and release notes
- map progress to milestone IDs
- summarize blockers, risks, and next decisions
- output a concise sponsor-ready report

## 9. Human Review Checklist for AI Output

- [ ] assumptions are explicit
- [ ] changed scope matches the approved task
- [ ] shared vs platform-specific code placement is justified
- [ ] tests are meaningful and pass
- [ ] no secrets or sensitive data were exposed
- [ ] docs were updated where needed
- [ ] approval-requiring tasks were not executed without consent

## 10. Acceptance Criteria for AI-Assisted Delivery

- [ ] AI outputs are traceable to approved requirements
- [ ] validation evidence accompanies every material code change
- [ ] AI use improves speed without weakening governance
- [ ] humans retain final decision authority for production-impacting changes