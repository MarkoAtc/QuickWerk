# TEC-95: Booking flow design parity

## Issue

`design/booking_flow/code.html` is a single-scroll "New Request" form: top progress bar + header (close ✕, title, avatar), three numbered sections (1. Describe the issue — free-text + photos, 2. Select Urgency — Urgent vs Scheduled cards, 3. Payment Method — Apple Pay vs saved card), a pricing/disclaimer summary card, and a sticky "Confirm Booking" footer.

Current `booking-wizard-screen.js` is structurally different: a category-conditional 3-step wizard (issue-type icon tiles → urgency icon tiles → location-confirm card), no free-text description, no photos, and no payment step at all. This ticket rebuilds it to match the mockup, same rigor as TEC-93/94.

- **Acceptance criteria:**
  1. New structure matches the mockup: header (close + title + avatar), static top progress bar, 3 numbered sections (description+photos, urgency, payment method), summary/disclaimer card, sticky confirm footer.
  2. `onComplete` payload keeps the existing `{ issueType, urgency, address, category }` shape so `submitBooking` (`booking-wizard-actions.js`) and its test (`booking-wizard-actions.test.js`) stay untouched — `issueType` now carries the free-text description string instead of a tile id, `urgency` becomes `'urgent' | 'scheduled'`.
  3. `pnpm --filter @quickwerk/product-app typecheck` and `test` pass; `pnpm -r typecheck` clean.
  4. Browser-driven verification via `.claude/skills/browser-drive`: from `/categories` (or `/home-triage`), pick a category, confirm the new screen renders all 3 sections, type a description, pick urgency, tap Confirm — request reaches `platform-api` (requires a real session, see Verification below), no console errors.

## Scope decisions (deviations from literal mockup, and why)

- **No hardcoded price.** The mockup shows a static "$45.00" service fee. There is no pricing engine anywhere in this codebase — showing a specific dollar figure directly above a commitment button is an unbacked claim (same class of issue CodeRabbit caught on TEC-94's "Premium Plus" banner). The summary card keeps the disclaimer copy but drops the number; it reads as a pricing-not-final notice, not a quote. **This is the pricing-source policy for TEC-96 (payment_checkout) too** — that screen must not show a real-looking total either, unless a real pricing source exists by then.
- **No fabricated saved card.** The mockup shows "Visa ending in 4242 · Expires 12/26" — a specific fake instrument on the *user's own* payment method, different in kind from decorative provider-listing data used elsewhere. Section 3 stays (structural 1/2/3 parity is the point of the ticket) but shows Apple Pay (decorative, unselected) + "Add a payment method" (decorative CTA) instead of a fake saved card. No real payment backend exists — selection here is not sent to `submitBooking` (it has no payment field today); real payment method capture is deferred to TEC-96.
- **Keep a compact address affordance the mockup omits.** The mockup has no address UI at all — it assumes location was set upstream. Checked all 3 entry points into `/booking-wizard` (`app/categories.js`, `app/home-triage.js` forward `address`; `provider-detail-screen.js` and `provider-profile.js` do **not** — they only pass `providerUserId`/`category`). Dropping the visible address+Edit affordance would silently book those two paths at the `DEFAULT_ADDRESS` fallback with no way to see or fix it — the same class of bug just fixed on TEC-94 (dropped address param). Keeping one compact `📍 {address} · Edit` line, wired to the existing bottom-sheet editor already in `app/booking-wizard.js`.
- **No real photo upload.** "Add Photos" button is decorative/no-op, same boundary already established for other no-backend controls (search bars, filter buttons). Mockup's fake photo-thumbnail preview is dropped entirely — showing a stock image as if the user already uploaded something is worse than omitting the affordance.
- **`STEPS_BY_CATEGORY` removed.** The mockup's issue-description is free text regardless of category, so the category-conditional icon-tile step sets are dead weight after this rebuild. Confirmed (`rg STEPS_BY_CATEGORY`) it's only referenced inside this file. Note: TEC-94's plan justified new category ids via this fallback mechanism — that reasoning is now moot since `category` flows to `submitBooking` as a plain string either way; not a contradiction, just superseded by this rebuild.
- **Progress bar stays static/decorative**, representing overall position in the (future) request → payment journey, not real per-field completion — same "decorative CSS animation/progress skipped" precedent as TEC-93/94.

## Not in scope

- Real payment processing / saved payment methods (TEC-96, `design/payment_checkout`).
- Real photo upload backend.
- Real pricing engine.
- `booking-screen.js`/`app/booking.js` — confirmed orphaned legacy route, untouched by this work (separate cleanup candidate).
- `booking-state.ts` and its test — belongs to the orphaned `booking-screen.js`, not used by `booking-wizard-screen.js`, untouched.

## Verification

```bash
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus browser-driven check via `.claude/skills/browser-drive`. Note: confirming all the way through `submitBooking` requires a real authenticated session (phone+OTP) and `platform-api` running — everything above the Confirm button (rendering, description input, urgency/payment selection, address edit) verifies without one.
