# TEC-90: Provider payout visibility route

## Issue

Marko's April kickoff explicitly reserved `TEC-90` for this: "provider payout visibility route in product app." Blocked until now on TEC-92 (no live UI path to a provider session existed at all — fixed and merged).

- **Acceptance criteria:**
  1. A provider can navigate from the provider workspace to a `/payouts` screen showing their payout history.
  2. Screen handles loading/empty/error/loaded states.
  3. Unauthenticated access redirects to `/auth`, matching every other gated screen's pattern.
  4. No changes to backend, API contracts, or the `payout-state`/`payout-screen-actions` modules — all three already exist, are tested, and are the contract this screen consumes as-is.

## Branch

`feature/tec-90-provider-payout-visibility`

## Already done (confirmed, do not rebuild)

- Backend: `GET /api/v1/providers/me/payouts` (paginated, session-gated) — `services/platform-api/src/payouts/`.
- `packages/domain`: `PayoutRecord`/`PayoutStatus` types.
- `packages/api-client`: `createGetMyPayoutsRequest`/`createGetPayoutDetailRequest`.
- `apps/product-app/src/features/payouts/payout-state.ts` + `.test.ts`: `PayoutLoadState` (idle/loading/loaded/error).
- `apps/product-app/src/features/payouts/payout-screen-actions.ts` + `.test.ts`: `loadMyPayouts(sessionToken, fetchImpl)`, handles both paginated-object and legacy-array response shapes.

None of the above need changes. `PayoutLoadState`/`loadMyPayouts` intentionally ignore `nextCursor` (no pagination UI) — out of scope, first page only, matches what the state module's shape already supports.

## Plan (frontend only)

- `apps/product-app/src/features/payouts/payout-screen.js`: new component. Pattern to follow (from `provider-screen.js`): `useSession()` + `resolveSessionToken()`, redirect to `/auth` if no token (matching every gated screen, e.g. `provider-screen.js`'s `loadOpenBookings`/`checkBookingAccess`), `useEffect` calling `loadMyPayouts` on mount, render by `PayoutLoadState.status`. Light background (`colors.background`), matching `provider-screen.js`'s outer container — this is a sibling screen to the provider workspace, not a new visual system.
  - Each payout row: amount (formatted via a local `formatMoney(amountCents, currency)` helper — `${currency} ${(amountCents/100).toFixed(2)}`, matching the existing convention in `booking-completion-presenter.ts`, not extracting a shared util), status badge (reuse the `StatusBadge`-style tone pattern already established in `provider-screen.js`: success/warning/default), booking id, created/settled dates.
  - Empty state: no payouts yet, plain message.
  - Error state: message from `PayoutLoadState.status === 'error'`.
- `apps/product-app/app/payouts.js`: route, thin wrapper rendering `PayoutScreen` (same pattern as `app/provider.js`).
- `apps/product-app/src/features/provider/provider-screen.js`: add a third button in the existing CTA row (next to "Manage profile & verification" / "Sign out") — `router.push('/payouts')`, `testID="provider-open-payouts"`.

## Not in scope

- No screen-level component tests — confirmed zero screen-level tests exist anywhere in this repo (only state/actions/presenter modules are unit-tested); not inventing that convention here.
- No pagination/cursor UI.
- No design-parity claim — no Stitch mockup exists for a payouts screen; this follows the existing provider-workspace visual language, not a literal design rebuild (unlike TEC-91's auth work).

## Verification

```bash
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus a live browser-driven check via `.claude/skills/browser-drive`: sign up/sign in as a provider (now working per TEC-92), navigate to payouts from the provider workspace, confirm the empty state renders (fresh provider has no payouts) and there are no console errors.
