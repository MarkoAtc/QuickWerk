---
description: Release + sync fan-out runbook for downstream repos
argument-hint: [source-ref] [target-repo or pilot-set]
---

# sync-release

Use this workflow to publish/update DAWC resources across target repos safely.

## Inputs
- `source-ref` (tag preferred, e.g. `v1.1.0`)
- target repo or target set (e.g. pilot list)

## Steps
1. Confirm release/changelog is complete in SoT repo.
2. Validate target repos include `.agent-sync.yml`.
3. For each target repo:
   - run sync (manual fallback: `scripts/awc-sync.ps1 sync`)
   - open PR with deterministic title:
     - `chore(agent-sync): update Webton ADOS bundle to <ref>`
4. Ensure protected paths unchanged (`00-core.md`, plans/reports).
5. Hand off to a human for merge (pilot repos first, then broaden) — agents open, monitor, and prepare rollback PRs, but do not merge them.

## Failure taxonomy + remediation

### F1 — Missing/invalid token auth
**Signal:** workflow cannot fetch/push/create PR due to auth errors.  
**Action:**
1) Validate secret exists (`ADOS_SYNC_TOKEN` or equivalent).  
2) Confirm scopes include repo/workflow as needed.  
3) Re-run sync.

### F2 — Actions cannot create/approve PRs
**Signal:** `GitHub Actions is not permitted to create or approve pull requests`.  
**Action:**
1) Repo settings → Actions → Workflow permissions:
   - enable read/write permissions
   - allow create/approve PRs
2) Re-run workflow.
3) If blocked, use manual fallback: create PR from pushed sync branch.

### F3 — Branch push denied/protected
**Signal:** push rejected for `chore/agent-sync-*`.  
**Action:**
1) Ensure bot/token has push rights to non-protected sync branch.
2) Use dedicated sync branch naming convention allowed by branch rules.
3) Re-run; if still blocked, push manually and open PR manually.

### F4 — Drift-check / required file mismatch
**Signal:** target CI fails due to missing required workflow/rules files.  
**Action:**
1) Compare target repo required set vs source include set.
2) Add missing required files or relax target check intentionally (with rationale).
3) Re-run CI before merge.

### F5 — Checkout/submodule auth recursion failure
**Signal:** recursive checkout fails on private/cross-repo auth.  
**Action:**
1) Use metadata/safe-mode drift checks (no recursive checkout).
2) Split full recursive checks into separate privileged workflow.
3) Re-run sync validation.

## Safety rules
- Never overwrite `.agent/rules/00-core.md`.
- Never merge these PRs yourself — leave them for human review/merge, per `AGENTS.md` §7.
- Keep rollback path (revert PR or pin previous tag).

## Validation gate
Before merge, confirm:
- protected paths untouched
- required checks pass
- fallback steps documented if non-standard action was needed
