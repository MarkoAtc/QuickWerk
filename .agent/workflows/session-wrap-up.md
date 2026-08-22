---
description: End-of-session cleanup, memory handoff, Global Brain update, and next-session continuity
argument-hint: [issue-id|session-note|handoff-target]
---

# Session Wrap-Up

## Goal
Finish an agent session in a consistent, evidence-backed way: preserve useful state, clean up resources, record only durable knowledge, and leave the next agent/human with a clear handoff.

## Inputs
`$ARGUMENTS` may contain an issue id, branch name, session note, or handoff target.
If no argument is provided, infer the active issue/branch from the current repo state and recent work.

## Operating rules
- Do not invent completion status. Separate **done**, **verified**, **blocked**, and **not started**.
- Do not store secrets, raw credentials, or volatile logs in memory or GBrain.
- Do not save stale task progress as durable agent memory; use repo artifacts and issue comments for task state.
- Prefer repo-local artifacts first: `.agent/plans/`, `.agent/reports/`, `.agent/proofs/`.
- If GBrain MCP is not accessible, produce a copy-paste-ready update block instead of failing the wrap-up.
- If there are uncommitted changes, report them explicitly and classify them as intended / unrelated / unsafe-to-commit.

---

## Step 1) Snapshot active state
Gather current state before summarizing:

1. Repo and branch:
   - current branch
   - dirty files
   - untracked files
   - recent commits relevant to this session
2. Issue/PR context:
   - related issue ids
   - open PR, if any
   - acceptance criteria touched
3. Runtime/process context:
   - background servers, watchers, long-running terminals
   - pending jobs or commands still running
   - temporary files/artifacts created

Output a short state block:

```text
State snapshot
- Branch: <branch>
- Related issue/PR: #<id> / PR #<id> / none
- Worktree: clean | dirty (<classified files>)
- Processes: none | <list>
- Verification status: not run | partial | green | red
```

## Step 2) Cleanup resources
Close only resources you own from this session.

Checklist:
- Stop dev servers/watchers/background processes started by this session, unless the user asked to keep them running.
- Remove disposable temp files outside tracked artifact folders.
- Keep evidence artifacts under `.agent/reports/` or `.agent/proofs/`.
- Do not delete user-created untracked files unless explicitly instructed.
- If cleanup is unsafe or ambiguous, list the exact items and ask the next operator/human to decide.

## Step 3) Verify and classify work
For each touched issue/task, record:

| Item | Status | Evidence | Remaining gap |
|---|---|---|---|
| #<id> | done / partial / blocked / not started | command, file, commit, report | next action |

Verification labels:
- `green`: required checks passed.
- `partial`: narrow checks passed, broader checks not run.
- `red`: a check failed; include the failing command and first actionable error.
- `blocked`: verification could not run due to missing access/env/tooling; say exactly what is missing.

## Step 4) Persist repo-local handoff
Create or update the appropriate artifact when meaningful:

- Execution/report artifact: `.agent/reports/execution-reports/<date>-<issue>-<slug>.md`
- Validation/proof artifact: `.agent/proofs/<topic>/<timestamp>.log`
- Plan/tracker artifact: `.agent/plans/<issue-or-topic>-*.md`

Handoff content MUST use the structured schema from `.agent/rules/00-core.md §9`. All five sections are required.

```markdown
# Session Handoff — <date> — <topic>

## Handoff

**Implemented:**
- <bullet per completed item>

**Left undone:**
- <bullet per incomplete item, with why>

**Commands run:**
| Command | Exit code |
|---------|-----------|
| <command> | 0 |

**Issues discovered:**
- <any surprises, hidden deps, tech debt>

**Procedures followed:** yes / partial / no
<explain if partial or no>
```

If no repo-local artifact is warranted, still include the handoff block in the final response.

## Step 5) Native memory selection
Decide whether anything belongs in the agent's durable memory.

Save only stable facts that will remain useful later, for example:
- user preference corrections
- durable environment conventions
- reusable project quirks
- non-trivial workflows worth turning into skills

Do **not** save:
- PR numbers, issue progress, commit SHAs, temporary blockers
- raw logs or large summaries
- facts likely to become stale within a week

If a reusable procedure was discovered after a difficult/iterative task, propose or create a skill instead of storing a long memory.

## Step 6) GBrain handoff
Use GBrain only when GBrain MCP is configured and authorized for this workspace. Do not assume it is configured — verify by checking for available GBrain MCP tools, project docs, or explicit user instruction before writing. If no validated mapping exists for this repo, use the draft/blocked path below instead of guessing a slug.

When GBrain is configured/authorized and the session produced durable changes, write one synthesized handoff block using GBrain MCP operations:

**Target page slug:** `projects/<project>/handoffs`
Derive `<project>` from *this* repo's own slug (e.g. the repo name) — never reuse another project's slug from an example or a different workspace's configuration.

**Write procedure:**
1. Call GBrain `get_page` (MCP) with `slug: "projects/<project>/handoffs"` to retrieve the current handoffs page (may not exist yet).
2. Prepend the new handoff block above any existing blocks (newest-first ordering).
   - If the page does not exist yet, create a fresh page with the frontmatter below and only the new block.
   - If the page exists, preserve its frontmatter but update `updated_at` to today's ISO date.
3. Call GBrain `put_page` (MCP) with `slug: "projects/<project>/handoffs"` and the updated markdown content to persist.

**Required frontmatter for new handoffs pages:**

```yaml
---
id: projects/<project>/handoffs
type: handoffs
project: <project>
created_at: <ISO date of first write>
updated_at: <ISO date of this write>
agent: <agent-name>
source: ados-session-wrap-up
confidence: high
links: []
tags: [handoff, ados]
---
```

**Handoff block schema** (prepend as newest-first entry):

```markdown
## YYYY-MM-DD — <short title>

### Done
- <evidence-backed bullet with issue/PR/artifact reference>

### Blocked
- <blocker with issue ref, or "none">

### Next
- <top 1-3 concrete next actions>
```

Rules:
- One block per session, not per commit.
- Reference issue/PR numbers and repo artifact paths, not commit SHAs.
- `Done` entries must match verified acceptance criteria or durable decisions.
- `Blocked` entries must be actionable or explicitly say `none`.
- Do not copy raw logs or execution reports verbatim; synthesize and link.
- Do not write if the session produced no durable changes, decisions, or validated status transitions.
- Keep operational logs in the source repo; GBrain receives synthesis and pointers.
- Apply the full Part 2 governance checklist from `GB_ADOS_INTEGRATION_CHARTER.md` before every write.

When GBrain is not configured, not accessible, or the correct location is unclear, output the same block as a copy-paste-ready draft instead:

```markdown
## GBrain handoff draft
Target page: projects/<project>/handoffs

## YYYY-MM-DD — <short title>

### Done
- <evidence-backed bullet with issue/PR/artifact reference>

### Blocked
- <blocker with issue ref, or "none">

### Next
- <top 1-3 concrete next actions>
```

## Step 7) Reflection and improvement candidates
Add a short reflection only if useful:

- What slowed the session down?
- Was an ADOS workflow missing, ambiguous, or stale?
- Did any issue need better acceptance criteria?
- Should a rule, workflow, skill, or doc be updated?

If yes, create one of:
- a follow-up issue draft
- a patch to `.agent/rules/` or `.agent/workflows/`
- a skill update proposal

## Step 8) Final response format
Return a concise terminal-friendly wrap-up:

```text
Session Wrap-Up
- Related issue/branch: ...
- Completed: ...
- Verification: ...
- Worktree/process state: ...
- Handoff artifact: ...
- Memory/GBrain: saved | draft provided | not needed
- Next best action: ...
- Blocked/Needs human: ... | none
```

If any action remains unsafe or requires human credentials/approval, state it explicitly under `Blocked/Needs human`.
