# QuickWerk Core Delivery Rules

This file is the canonical repository contract for planning, implementation, validation, review, handoff, and delivery. `AGENTS.md` supplies the concise operator guide; when guidance conflicts, explicit user instructions take precedence, followed by `AGENTS.md`, then this file, then individual workflow files.

## 1. Repository baseline

- Runtime: Node.js 20.19+ and TypeScript in a pnpm 10.6 workspace orchestrated with Turborepo.
- Product app: Expo Router, React Native, and React Native Web under `apps/product-app`.
- Admin app: Next.js under `apps/admin-web`.
- Backend: NestJS under `services/platform-api`.
- Persistence: repository interfaces with in-memory and raw PostgreSQL implementations; there is no ORM schema layer.
- Shared client contracts belong in `packages/api-client`; shared domain behavior belongs in `packages/domain`.

## 2. Issue-first delivery

- Every product or engineering change starts from a GitHub issue or a complete Issue Draft.
- An Issue Draft must include a title, problem/body, acceptance criteria, and suggested labels.
- Save implementation plans to `.agent/plans/<issue-id-or-draft>-<slug>.md`.
- Do not use `TASK.md`, `TODO.md`, or chat history as the active tracker.
- Newly discovered work becomes a separate issue or Issue Draft unless it is required to satisfy the active acceptance criteria.

## 3. Scope and approval boundaries

- Keep changes minimal, reviewable, and limited to the selected issue.
- Do not change authentication controls, payment policy, data-retention behavior, production data, secrets, or deployment state without explicit owner approval.
- Preserve customer/provider authorization boundaries and use existing domain services and repository patterns.
- Do not install dependencies or introduce new infrastructure unless the task explicitly authorizes it.
- Stop and request direction when a missing product or policy decision would materially change the result.

## 4. Branches, commits, and pull requests

- Use short-lived branches named `codex/feature/<issue>-<slug>`, `codex/fix/<issue>-<slug>`, or `codex/chore/<issue>-<slug>` unless the user requests another name.
- Use atomic Conventional Commits: `<type>(<scope>): <summary> (#<issue>)`.
- Add the executing tool's normal `Co-Authored-By` trailer when applicable.
- Open pull requests against `main`, link the issue with `Fixes #<issue>` or `Refs #<issue>`, and include What/Why, verification evidence, and risks.
- Never merge your own pull request. Leave it open for human review and merge.
- Bootstrap exception: a user-authorized, local-only recovery commit whose purpose is to restore the missing issue/workflow contract may omit an issue number only when it includes a complete Issue Draft in `.agent/plans/` and is not pushed as a PR without first receiving an issue reference.

## 5. Hybrid-Light planning and implementation gates

- Before implementation, confirm that the issue/specification and acceptance criteria are explicit enough for another agent to decide done versus not done.
- Classify the slice as `risky-logic` or `low-risk/docs`.
- For `risky-logic`, record a failing test or contract check before implementation and GREEN evidence afterward.
- For `low-risk/docs`, record substitute proof such as source comparison, link/path validation, or dry-run output.
- Every plan needs a Validation Contract covering assertions, relevant performance bounds, and interface boundaries. Use `N/A — <reason>` when a category genuinely does not apply.
- Implement in bounded slices and update the plan/checkpoint when execution diverges materially.

## 6. Architecture and code constraints

- Keep controllers and UI components focused on orchestration; place business rules in services, presenters, state modules, or shared domain packages.
- Prefer existing API routes, state transitions, repository providers, and shared request builders over parallel implementations.
- Product features should remain cross-platform by default; document intentional web/native divergence.
- Never fabricate backend-backed metrics or capabilities to imitate a design. Implement the approved demo-fidelity capability or explicitly scope it as a separate issue.
- Add or update regression coverage for behavior changes.

## 7. Repository validation contract

Discover commands from `package.json` and `.github/workflows/ci.yml`; do not invent root aliases. This repository has no root lint, `test:run`, or aggregate `build` script.

Minimum type-check:

```sh
pnpm check
```

CI-equivalent validation before a commit or pull request:

```sh
pnpm check
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/product-app test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

For product-app route or UI changes, also run an Expo web export and perform focused browser QA when the acceptance criteria depend on an interactive flow. Use bounded worker settings when required by a documented local environment flake, and record the deviation.

## 8. Review and gate results

- Self-review is sufficient only for small `low-risk/docs` changes.
- Risky or larger work requires a fresh review pass before it is declared ready.
- After every PR push, run `.agent/workflows/review-pr.md` until CI is green and no actionable CodeRabbit or human review comments remain.
- If CodeRabbit does not start automatically, request a manual review and record that fallback.
- Use this phase-boundary block in loop checkpoints and reports:

```markdown
## Gate Result

- Gate: Plan | Verify | Review | Close
- Status: PASS | FAIL | BLOCKED
- Evidence: <commands, artifacts, issue/PR links>
- Remaining gaps: none | <specific gaps>
- Next action: <single concrete action>
```

## 9. Session handoff contract

Meaningful handoffs must be stored under `.agent/reports/` and contain all five sections:

```markdown
# Session Handoff — <date> — <topic>

## Handoff

**Implemented:**
- <completed item and evidence>

**Left undone:**
- <incomplete item and reason>

**Commands run:**
| Command | Exit code |
|---------|-----------|
| <command> | 0 |

**Issues discovered:**
- <surprise, dependency, or follow-up>

**Procedures followed:** yes | partial | no
<explanation when partial or no>
```

Classify the worktree and owned processes explicitly. Keep durable evidence; remove only disposable files owned by the session. Never delete ambiguous user files.

## 10. GBrain and durable memory

- At the start of a substantive task, use GBrain `context_pack` for `Kenny`, `Codex`, and `ADOS` with a small server-side token budget when the MCP tools are available and authorized.
- Use `recall` only for additional project/person context that materially helps the task.
- Store only durable, verified facts with provenance and the relevant entity. Never store credentials, raw authentication data, volatile task progress, or guesses.
- Repository artifacts and explicit user instructions override recalled memory.
- During wrap-up, write a synthesized project handoff only when the workspace mapping is validated and the session produced durable changes.
- If GBrain is configured but unavailable to the running client, report the limitation and provide a draft; configuration changes or newly available environment variables require a refreshed client/session before tools can appear.

## 11. Completion conditions

Work is complete only when acceptance criteria have evidence, required validation has passed, the review gate is satisfied, relevant documentation is current, and no required follow-up remains hidden in chat. A PR is not complete while CI is failing or actionable review feedback remains. Leave merge authority to the human owner.
