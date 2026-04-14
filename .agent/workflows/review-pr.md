---
description: Monitor and resolve CodeRabbit + CI feedback after opening a PR
argument-hint: [pr-number-or-url]
---

# Review-PR: Post-Open PR Feedback Loop

## Purpose

After a PR is opened, automated review runs immediately. This workflow defines how an execution agent must monitor and act on that feedback before declaring work complete.

**Rule:** "In Review" does not mean "await Board only."
If automated reviewer output creates clear next actions, the agent owns those follow-up actions until the PR is materially ready for Board review.

## Inputs

`$ARGUMENTS` should contain the PR number or URL. If not provided, derive it from the most recently opened PR on the current branch:

```sh
gh pr view --json number,url,statusCheckRollup,reviewDecision,state
```

## Stop Condition (exit early if all true)

Before doing any work, check whether the PR already meets all of these:

1. CI checks: all passing (no failures, no pending)
2. CodeRabbit: no actionable comments remaining (no unresolved threads requesting code changes)
3. Review decision: no "request changes" from other reviewers
4. PR state: open (not already merged or closed)

If all conditions are met → exit this workflow. The PR is ready for Board review.

## Step 1 — Check CI Status

```sh
gh pr checks <PR_NUMBER> --watch --interval 30
```

Or for a point-in-time snapshot:

```sh
gh pr checks <PR_NUMBER>
```

Classify each check:
- **pass** — no action needed
- **fail** — investigate and fix (see Step 3)
- **pending** — wait up to 10 minutes; if still pending after that, note it and continue

## Step 2 — Read CodeRabbit Feedback

```sh
gh pr view <PR_NUMBER> --comments
```

Filter for CodeRabbit comments. Classify each:

| Type | Action |
|---|---|
| Summary / walkthrough | Read for context; no code change needed |
| Nitpick (labeled `[NIT]`) | Optional; address if trivial (1-2 lines) |
| Suggestion with clear improvement | Address it |
| Bug or correctness issue | Must address |
| Security or data-safety issue | Must address immediately |
| Question without clear action | Use judgment; leave a reply if needed |

**Do not address:** stylistic opinions that conflict with existing codebase conventions, or suggestions that would expand scope beyond the original issue.

## Step 3 — Fix CI Failures

For each failing check:

1. Read the failure log:
   ```sh
   gh run view --log-failed
   ```
2. Identify the root cause (lint, type error, test failure, build error).
3. Fix the minimum code needed to resolve it.
4. Run the check locally to confirm the fix:
   ```sh
   # Example — adjust per repo tooling
   pnpm lint && pnpm typecheck && pnpm test:run
   ```
5. Commit and push:
   ```sh
   git add -p
   git commit -m "fix: resolve CI failure - <short description>"
   git push
   ```
6. Wait for CI to re-run, then re-check.

## Step 4 — Address CodeRabbit Actionable Comments

For each actionable comment:

1. Read the full comment thread to understand what is being asked.
2. Locate the referenced file and line.
3. Implement the improvement (minimal, targeted).
4. Commit:
   ```sh
   git commit -m "refactor: address CodeRabbit feedback - <short description>"
   git push
   ```
5. Resolve the comment thread (or leave a reply if you disagree with clear reasoning).

## Step 5 — Re-check

After pushing fixes, wait for CI and CodeRabbit to re-run, then repeat Steps 1-4 until the stop condition is met.

Timeout: if CI is still failing after 3 push-fix cycles on the same root cause, stop and escalate by updating the Paperclip issue to `blocked` with a clear description of the failure.

## Step 6 — Declare Ready for Board

When the stop condition is met:

1. Post a comment on the Paperclip issue:
   - CI: passing
   - CodeRabbit: no remaining actionable feedback
   - PR: link to the PR
2. Update the Paperclip issue status to `in_review` (do not set to `done` — the Board merges).
3. Exit.

## Common Pitfalls

- Do not re-open previously resolved threads without new evidence.
- Do not rewrite large sections of code to satisfy a single style comment.
- Do not push empty commits to trigger CI — fix the root cause.
- Do not mark done before CI is green.
