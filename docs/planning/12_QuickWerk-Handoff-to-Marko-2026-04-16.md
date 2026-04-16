# QuickWerk Handoff Briefing → Marko (2026-04-16)

## 0) TL;DR
- **Current delivery head:** `feature/tec-84-verification-review-parity`
- **Open PR to merge first:** **#29** (`TEC-84` + `TEC-87`), clean/mergeable
- **Where Marko should continue after merge:** the already-defined next slice from kickoff: **TEC-90** (provider payout visibility route in product app)
- **Paperclip status:** Last documented kickoff created/assigned `TEC-90`; **current Paperclip API is unreachable on this machine**, so project pause/deactivate could not be executed right now.

---

## 1) QuickWerk progress status (Paperclip + code)

## 1.1 Paperclip/org progress (what is confirmed)
From the latest local phase docs/artifacts:
- Phase-18 kickoff documented and completed as planning handoff.
- Execution task **`TEC-90`** was created and assigned to CodexCoder.
- Kickoff explicitly re-baselined against `origin/main` and avoided overlap with open PR #29.

References:
- `.agent/plans/tec-89-phase-18-kickoff.md`
- `.agent/artifacts/tec-89-phase-18-artifacts.md`
- `.agent/artifacts/tec-89-phase-18-proof.md`

## 1.2 Repo/code progress (where we stand now)
- Active branch locally: `feature/tec-84-verification-review-parity`
- Branch relation: `feature/tec-84-verification-review-parity` is **3 commits ahead of `origin/main`** (`0 behind / 3 ahead`)
- Open PR: `https://github.com/MarkoAtc/QuickWerk/pull/29`
  - Title: `feat(platform-api,product-app): enforce provider approval gates for discovery and booking (TEC-87)`
  - Includes combined work for `TEC-84` + `TEC-87`
  - Merge state: `CLEAN`
  - Size: `31 files`, `+785/-55`

---

## 2) Exact handoff join-point for Marko

## 2.1 Handoff started at
- **Phase-18 kickoff / TEC-89**: explicit re-baseline + next-slice selection
- Then implementation pushed on current branch and opened as **PR #29**

## 2.2 Marko should continue at
1. **Merge PR #29** into `main`
2. Pull latest `main`
3. Continue with **TEC-90** (provider payout visibility route + finance handoff in product app), as already selected in kickoff docs

Why TEC-90 as direct continuation:
- It is the documented “next non-overlapping slice” after PR #29
- It closes the roadmap gap of provider payout visibility with existing backend/API primitives

---

## 3) What is still outstanding (planning/roadmap)

According to planning + current state:
- The stack has advanced through trust, booking, and major phase-2/phase-3 infrastructure slices.
- Remaining pragmatic forward work is now mostly **product-facing docking and completion slices** (e.g., provider payouts route, follow-up production hardening, ops continuity).

Primary immediate outstanding item (already chosen):
- **TEC-90** — Provider payout visibility route in product app.

Supporting refs:
- `docs/planning/02_Development-Roadmap-and-Milestones.md`
- `docs/planning/08_Implementation-Handoff-and-Docking-Guide.md`
- `.agent/plans/tec-89-phase-18-kickoff.md`

---

## 4) Local state audit (for clean handover)

## 4.1 Working tree (NOT clean)
Current branch has local, uncommitted and untracked files.

### Modified tracked files
- `apps/admin-web/next-env.d.ts`
- `apps/product-app/src/features/provider/provider-screen.js`
- `apps/product-app/src/features/provider/provider-state.test.ts`
- `apps/product-app/src/features/provider/provider-state.ts`

### Untracked (not committed)
- `.agent/artifacts/`
- `.agent/plans/tec-55...tec-89 kickoff files`
- `.agent/pr-body-phase3-slice1.md`
- `.claire/`
- `.claude/` (includes worktrees)
- `apps/product-app/app/provider-payouts.js`
- `apps/product-app/src/features/payouts/payout-route-state.ts`
- `apps/product-app/src/features/payouts/payout-route-state.test.ts`
- `apps/product-app/src/features/payouts/payout-screen.js`

## 4.2 Local branch hygiene
- **25 local branches** have `[gone]` upstreams (stale local refs)
- Remote branch set is compact (healthy): only `main`, current feature branch, and few active branches

## 4.3 Important local-only risk
- `.claude/worktrees/*` branches/worktrees exist and are local dev artifacts.
- Before Marko continues locally, ensure no accidental dependency on those local paths.

---

## 5) Remote state audit

## 5.1 Open PRs
- Exactly **1 open PR**: #29 (mergeable, non-draft)

## 5.2 Open GitHub issues
- `gh issue list` returns **no open issues** in the repository (at fetch time)

## 5.3 CI/workflows/docs
- Active workflow present: `.github/workflows/ci.yml`
- README is substantially up to date regarding architecture/state.
- No obvious missing mandatory docs for immediate handoff, but see migration note below.

## 5.4 Migration sequencing warning (important)
In `services/platform-api/migrations/` there are both:
- `0009_booking_customer_location.sql`
- `0009_signup_customer_profile_fields.sql`

This duplicate numeric prefix can create ambiguity in manual migration sequencing if scripts assume strict monotonic numbering by filename. Marko should normalize this before broader team execution (e.g., rename one to `0010_...` and update docs/scripts consistently).

---

## 6) Env/config variables Marko must know

For normal in-memory mode (default), minimal setup still works.
For persistent/relay features, these are relevant:

Core:
- `PERSISTENCE_MODE` (`in-memory` or `postgres`)
- `DATABASE_URL` (required when `PERSISTENCE_MODE=postgres`)
- `AUTH_SESSION_TTL_SECONDS` (optional)

Relay/operator path (if using persistent relay features):
- `BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent`
- `BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE`
- `BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE`
- `BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES`
- readiness/SLO vars documented in `docs/ops/platform-api-env.md` and `docs/infra/relay-queue.md`

Also note:
- `RUN_POSTGRES_INTEGRATION_TESTS=1` enables postgres integration suites.

---

## 7) Paperclip pause/deactivate action status

## Requested action
Pause/deactivate QuickWerk in Paperclip to avoid agent collision with Marko.

## Current result
❌ **Could not execute now** because local Paperclip API is currently unreachable:
- `GET http://localhost:3100/api/companies` fails (`fetch failed`)
- `curl/port check` shows nothing listening on `:3100`

## Safe next command path (once Paperclip is running)
1. Start/reconnect Paperclip API (on the host where company state lives)
2. Identify active QuickWerk-assigned open issues
3. Reassign or set to blocked/paused state with explicit handoff comment to Marko
4. Disable/stop any automation loop touching QuickWerk issues

Suggested CLI skeleton (to run where Paperclip is live):
- `paperclipai issue list -C <COMPANY_ID> --status todo,in_progress,blocked --json`
- `paperclipai issue update <ISSUE_ID> --status blocked --comment "QuickWerk handoff to Marko; agent execution paused to avoid collision."`

---

## 8) Recommended handoff checklist for Marko

1. Merge PR #29.
2. Pull `main` fresh.
3. Apply/validate migrations in correct order (resolve duplicate `0009` naming first).
4. Confirm env (`PERSISTENCE_MODE`, `DATABASE_URL`, relay vars if needed).
5. Continue with TEC-90 (provider payout route) as next bounded slice.
6. Keep Paperclip QuickWerk tasks paused/reassigned during Marko-owned execution window.

---

## 9) Confidence
- ✅ Git local/remote status and PR state are directly verified.
- ✅ Handoff continuation point (TEC-90) is documented and consistent across artifacts.
- ⚠️ Paperclip live pause action is pending because API/service was offline at verification time.
