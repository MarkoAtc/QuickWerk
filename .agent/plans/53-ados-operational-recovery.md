# Issue #53 — Restore QuickWerk's ADOS operational contract

## Issue

[#53 — Restore QuickWerk ADOS operational contract](https://github.com/MarkoAtc/QuickWerk/issues/53)

## Title

Restore the missing ADOS core rules and preserve untracked handoff artifacts

## Problem

QuickWerk's ADOS workflows reference `.agent/rules/00-core.md`, gate-result conventions, and a structured handoff schema, but the canonical rules file has never existed in repository history or in the ADOS 0.6.0 package baseline. The repository also retained durable handoff reports as untracked files, carried an unrelated local `.vscode` setting, documented nonexistent root validation aliases, and omitted the manual CodeRabbit fallback observed during recent delivery work.

The locally installed ADOS CLI was also still at 0.1.0 although the repository was synchronized against 0.6.0.

## Acceptance criteria

- [x] GBrain configuration, hub reachability, and authentication are diagnosed without exposing credentials.
- [x] The global ADOS CLI matches the repository baseline at version 0.6.0.
- [x] Durable August 22 and August 28 handoff/retrospective artifacts are preserved for commit.
- [x] The local-only `.vscode/settings.json` is removed and `.vscode/` is ignored.
- [x] `.agent/rules/00-core.md` defines issue-first delivery, scope/approval boundaries, Hybrid-Light gates, actual CI commands, review gates, gate-result output, handoff schema, and GBrain handling.
- [x] `AGENTS.md` and `.agent/workflows/review-pr.md` use the repository's real NestJS/CI commands and manual CodeRabbit fallback.
- [x] The core delivery loop requires only workflow files that actually exist; review, revise, close, and retrospective remain explicit evidence-producing phases.
- [x] ADOS dry-runs, documentation checks, and repository validation pass.
- [x] The recovery is captured in one local atomic commit.

## Labels (suggested)

- chore
- documentation
- developer-experience
- ados

## Risk / evidence classification

`low-risk/docs` — no runtime, authentication, payment, database, or retention behavior changes. Substitute proof consists of ADOS bootstrap/doctor output, source-path/reference checks, native WSL Git inspection, and the repository's existing CI-equivalent validation commands.

## Delivery

- Branch: `codex/chore/53-ados-operational-recovery`
- Plan: `.agent/plans/53-ados-operational-recovery.md`
- The initial local-only bootstrap commit is amended with the issue reference before publication.

## Verification evidence

- `ados --version`: 0.6.0 from Windows and WSL.
- `ados bootstrap --dry-run --full`: no missing package-baseline files; intentional repository-specific divergences are preserved without `--force`.
- Critical ADOS path check: core rules, loop, and all required executable workflow files exist.
- Stale active-reference scan: no Express backend, nonexistent root validation alias, or phantom required-workflow reference remains.
- `git diff --check`: clean.
- `pnpm check`: passed across all typechecked workspaces.
- Background-workers build: passed.
- Platform API tests: 334 passed, 3 skipped.
- Admin tests: 46 passed.
- Product-app tests: 282 passed.
- Admin and platform API production builds: passed.
