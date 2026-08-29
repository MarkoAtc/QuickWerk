# AGENTS.md — QuickWerk

Operational guide for AI execution agents working in this repository.

## 1. Before You Start

1. Run `.agent/workflows/prime.md` to orient yourself.
2. Read the relevant plan file from `.agent/plans/`.
3. Check the active GitHub issue (if one exists) for context and acceptance criteria.

## 2. Workflow Files

| Workflow | When to use |
|---|---|
| `.agent/workflows/prime.md` | Cold-start / first touch on a task |
| `.agent/workflows/plan-feature.md` | Drafting an implementation plan |
| `.agent/workflows/execute.md` | Implementing a planned change |
| `.agent/workflows/validate.md` | Full validation before hand-off |
| `.agent/workflows/validate-simple.md` | Quick lint/type/test check |
| `.agent/workflows/review-pr.md` | **Post-PR: CodeRabbit + CI feedback loop** |
| `.agent/workflows/commit.md` | Atomic commit conventions |

## 3. PR Review Rule (CodeRabbit)

**Opening a PR is not the end of your work.**

Every PR in this repo is automatically reviewed by CodeRabbit after each push. CI also runs automatically. After opening (or pushing to) a PR:

1. Run `.agent/workflows/review-pr.md`.
2. Fix CI failures and address actionable CodeRabbit comments.
3. Re-push until CI is green and no actionable feedback remains.
4. Leave the PR open for human review/merge — do not merge it yourself.

Agents must **not** go idle while CI is failing or CodeRabbit has unresolved actionable comments.

## 4. Stack Reference

- **Runtime:** Node.js / TypeScript (pnpm workspaces + Turborepo)
- **Frontend:** React (product-app + admin-web)
- **Backend:** NestJS (platform-api service)
- **Database:** PostgreSQL, raw SQL repositories (no ORM — no Drizzle schema layer exists in this repo)
- **Auth:** JWT-based sessions

Key entry points:
- `services/platform-api/src/` — backend API
- `apps/product-app/src/` — customer-facing app
- `packages/api-client/src/` — typed API client (shared)
- `services/platform-api/migrations/` — DB migrations

## 5. Validation Commands

Run the CI-equivalent checks before any commit or PR:

```sh
pnpm check
pnpm --filter @quickwerk/background-workers build
pnpm --filter @quickwerk/platform-api test
pnpm --filter @quickwerk/admin-web test
pnpm --filter @quickwerk/product-app test
pnpm --filter @quickwerk/admin-web build
pnpm --filter @quickwerk/platform-api build
```

For product-app route or UI changes, also run an Expo web export and focused browser QA when the acceptance criteria depend on an interactive flow.

## 6. Commit Convention

```
<type>(<scope>): <summary> (#<issue-number>)

Co-Authored-By: <executing agent/tool, per its own convention>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## 7. Key Rules

- Do not change auth, payment, or data-retention controls without explicit approval from the repo owner.
- Do not expand scope beyond the assigned issue.
- Do not merge your own PRs — leave them open for human review/merge.
