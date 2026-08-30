# Validation — Issue #62 Active/Post-Job Responsiveness

## Results

| Category | Result | Evidence |
|---|---|---|
| RED proof | PASS | The new policy test initially failed because `active-post-job-layout` did not exist. |
| Focused GREEN tests | PASS | 11 files, 94 tests: responsive policy plus active-job, completion, and review route/action/presenter/state coverage. |
| Product test suite | PASS | 42 files, 333 tests. |
| Workspace type-check | PASS | `pnpm check` completed with zero errors. |
| Expo web export | PASS | Web bundle exported to `/tmp/quickwerk-62-active-post-job-web`. |
| Diff whitespace | PARTIAL | The three modified tracked screen files pass the scoped check. The workspace-wide command is blocked by unrelated malformed `design/**:Zone.Identifier` paths already present in the worktree. |
| Browser runner | PASS | Expo web loaded through the available browser backend at `host.docker.internal:8081`; no error overlay or blank page was observed. |
| Browser viewport matrix | PARTIAL | The unauthenticated shell has no horizontal overflow at `320x640`, `360x800`, `390x844`, `430x932`, and `1024x900`. Protected route content remains blocked before render because the browser backend cannot reach the local API for OTP authentication. |
| CI-equivalent cross-workspace checks | pending | Required before PR/close gate. |

## Commands run

```sh
pnpm --filter @quickwerk/product-app exec vitest run src/shared/active-post-job-layout.test.js
pnpm --filter @quickwerk/product-app exec vitest run src/shared/active-post-job-layout.test.js src/shared/responsive-layout.test.js src/features/booking/active-job-route-state.test.ts src/features/booking/active-job-presenter.test.ts src/features/booking/active-job-screen-actions.test.ts src/features/booking/booking-completion-route-state.test.ts src/features/booking/booking-completion-presenter.test.ts src/features/booking/booking-completion-screen-actions.test.ts src/features/booking/review-screen-actions.test.ts src/features/booking/review-screen-presenter.test.ts src/features/booking/review-state.test.ts
pnpm --filter @quickwerk/product-app test
pnpm check
pnpm --filter @quickwerk/product-app exec expo export --platform web --output-dir /tmp/quickwerk-62-active-post-job-web
```

## Gate Result

- Gate: Verify
- Status: BLOCKED
- Evidence: all automated product and export checks pass; the web app loads without overflow at every required viewport in the unauthenticated shell.
- Remaining gaps: the authenticated protected-route browser matrix requires API access from the browser backend; CI-equivalent cross-workspace checks, fresh review, PR, CI, and CodeRabbit remain. A workspace-wide whitespace check also needs the unrelated malformed paths resolved or excluded by their owner.
- Next action: expose a safe browser-reachable test API or provide an authenticated browser fixture, then rerun the protected-route matrix.
