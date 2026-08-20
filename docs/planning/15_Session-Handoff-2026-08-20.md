# Session Handoff — 2026-08-20

## Status: Stopping point reached, resume tomorrow

This session worked through the UI redesign migration's booking/active-job phases (`13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`) plus one cross-cutting scope decision. Everything below is merged to `main` and verified; nothing is left half-done or uncommitted.

---

## What Shipped

| # | PR | Ticket | Summary |
|---|---|---|---|
| 1 | [#35](https://github.com/MarkoAtc/QuickWerk/pull/35) | TEC-95 | Booking flow rebuilt to match `design/booking_flow`: free-text description + photos, urgency cards, payment-method section, disclaimer summary card instead of a fabricated price. |
| 2 | [#36](https://github.com/MarkoAtc/QuickWerk/pull/36) | — | Findings doc (`14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md`) resolving whether to skip or build toward mockups that imply unbuilt backend capability. Decision: build at demo fidelity, don't skip. |
| 3 | [#37](https://github.com/MarkoAtc/QuickWerk/pull/37) | TEC-96 | Real provider identity card on active-job (photo, name, rating, vehicle, plate). |
| 4 | [#38](https://github.com/MarkoAtc/QuickWerk/pull/38) | TEC-97 | Real "Call Provider" button — phone number persisted + booking-scoped authorized lookup. |
| 5 | [#39](https://github.com/MarkoAtc/QuickWerk/pull/39) | TEC-98 | Simulated en-route ETA/distance tracking, explicitly tagged `source: 'simulated'` in the API. |

TEC-96/97/98 together complete `design/live_job_tracking` design parity (3 slices, each its own PR by design — see §4 of doc 14 for why).

---

## The Cross-Cutting Decision (read this first if picking this back up)

Two mockups (`payment_checkout`, `live_job_tracking`) turned out to depict product capabilities the backend didn't have — not visual gaps like the earlier tickets, but real subsystems (pre-job checkout with saved cards, live GPS). Initial instinct was to skip them; **corrected directly by Kenny**: this is a minimal MVP/demo build, not a fixed ceiling — when an approved design calls for more, plan and build the capability, don't skip the screen. That correction is saved in memory (`feedback_design_parity_scope`) and governs how to treat this class of gap going forward.

Full detail, the resulting fidelity decisions (simulated payment processing, simulated location feed), and the execution sequence are in **`docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md`** — read that before scoping the next slice.

---

## Real Findings This Session (not just feature work)

These are worth knowing about even if you're not touching this code again soon:

1. **Vehicle/license-plate privacy bug (caught pre-merge, TEC-96).** An initial pass put `vehicleDescription`/`licensePlate` on the *public* provider-discovery endpoint (`GET /providers/:id`, no auth). Caught before opening the PR — moved to a booking-scoped lookup authorized to the specific customer/provider on an *accepted* booking. `ProvidersService` now has a public-safe serializer and a separate booking-scoped one; never conflate them again.

2. **Providers have no phone number on file today (TEC-97).** Customers authenticate via phone+OTP and end up with a phone on file; providers authenticate via email/password and never do. The "Call Provider" plumbing is correct and forward-compatible (verified symmetrically both directions), but the button won't appear for any real booking until a follow-up captures a phone during provider onboarding. Not started — out of scope for TEC-97.

3. **Operator-authorization-bypass bug, found by CodeRabbit on PR #39, fixed across 4 endpoints.** The pattern:
   ```ts
   if (session.role === 'customer' && booking.customerUserId !== session.userId) return 403;
   if (session.role === 'provider' && booking.providerUserId !== session.userId) return 403;
   ```
   Any role that is neither `'customer'` nor `'provider'` (i.e. `'operator'`) matches neither branch and falls through with full access — contradicting every one of these methods' own "only a party to this booking" intent. Fixed with one shared `BookingsService.isBookingParty(session, booking)` helper, applied to:
   - `getBookingTracking` (new in this PR)
   - `getBookingProviderIdentity` and `getBookingContact` (already merged from TEC-96/97 — same file, same branch, fixed retroactively)
   - `getBookingPayment` (**pre-existing, predates this session** — confirmed operators have their own purpose-built access path via the disputes module, so this was never an intended capability, just the same bug)

   Regression tests (operator-denial) added to all four test files. If you add a fifth booking-scoped sensitive-data endpoint, use `isBookingParty`, not a fresh pair of role-branches.

4. **`estimatePaymentAmountCents` in `bookings.service.ts` is hardcoded to `12000` and ignores its `requestedService` argument.** Pre-existing, flagged but not fixed (superseded by the real pricing table when the payment sequence gets built — see doc 14 §2).

---

## What's NOT Started

**The payment sequence** (`design/payment_checkout`) — deliberately not begun. Per doc 14 §4/§2, this is a materially larger body of work than any single slice shipped today:

1. Real itemized pricing table (nothing like it exists — `estimatePaymentAmountCents` is the entire current "pricing engine").
2. Payment-method storage (new domain module, simulated fidelity — fake label/last4, no real card data).
3. Pre-job checkout endpoint (touches the booking state machine — need to decide whether checkout records the final simulated payment or an authorization that completion finalizes, and reconcile with the existing post-completion `capturePaymentForBooking` path so there's one payment write path, not two).
4. The `/checkout` screen itself.

Also noted but not chased: `design/review_rating` — the `reviews` backend module already exists and looks like a cheap standalone win whenever there's a slot for it.

---

## Resuming Tomorrow

- **Repo state:** `main` is clean, all 5 PRs merged, no open branches from this session. Backend: 284 tests passing. Frontend: 244 tests passing. `pnpm -r typecheck` clean across all 12 workspaces.
- **Dev servers:** were running locally throughout (`platform-api` on :3000, product-app web on :8081, in-memory persistence mode). If starting fresh: `pnpm --filter @quickwerk/platform-api dev` and `pnpm --filter @quickwerk/product-app dev:web` from repo root. **In-memory mode means all seeded data (test accounts, bookings) is gone on restart** — nothing persists between dev-server sessions.
- **Browser verification:** `.claude/skills/browser-drive` (Playwright/headless Chromium) was used for all UI verification this session, including a couple of standalone Node/Playwright scripts (not just the skill's stdin-driven `drive.mjs`) when a scenario needed the browser to stay alive across an API call made from the same process — see PR #37/#38/#39 descriptions for the exact E2E flow if reproducing.
- **Plan docs:** every ticket has a `.agent/plans/tec-9X-*.md` with acceptance criteria, scope decisions, and verification steps — read the relevant one before touching that screen again.
- **Next slice, if continuing the payment sequence:** start with the pricing table (smallest, everything else depends on it), then payment-method storage, then the checkout endpoint (make the write-path decision explicit before writing code), then the screen. Each is plausibly its own PR given how the tracking-sequence slices went.
