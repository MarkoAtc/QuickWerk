# Design Mockup vs. Backend Capability Gaps (2026-08-20)

## 1. Purpose

While executing the UI redesign migration (`13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`) screen-by-screen — TEC-93 (home), TEC-94 (service categories), TEC-95 (booking flow) shipped so far — two of the next screens in Phase 4/5 turned out to depict product capabilities that don't exist anywhere in the backend today, not just visual/structural gaps. This doc flags that pattern for a sponsor decision before more design-parity tickets are cut against them.

Migration plan §4.2 already frames the Stitch HTML as "visual reference and component blueprint, not final implementation" — so this isn't a claim that the mockups are wrong, only that two of them assume a product/payments model this codebase hasn't built, and building the visuals as literally drawn would mean fabricating money- and safety-adjacent data (specific charges, saved card numbers, live GPS ETAs, a working phone number) with nothing real behind it.

## 2. `design/payment_checkout` — no pre-job checkout exists

The mockup is a pre-job "Checkout" screen: pick a payment method (Apple Pay or a saved Visa card), see an itemized total (call-out fee + labor + platform fee), tap "Pay Securely $227.50".

The actual backend (`services/platform-api/src/bookings/bookings.service.ts`) has no such flow:
- Payment is captured automatically **after** a booking is marked `completed`, via `capturePaymentForBooking` — there is no pre-job charge.
- The captured amount is `estimatePaymentAmountCents()`, which is **hardcoded to return 12000 cents ($120.00) regardless of the requested service** — the method's own parameter is unused.
- There is no payment-method storage anywhere (no saved cards, no Apple Pay integration).

Building this screen as drawn would ship a "Pay Securely $227.50" button wired to nothing, showing a total that has no relationship to what the system will actually charge later. Skipped for now (not built); the underlying `estimatePaymentAmountCents` flat-rate/ignored-parameter behavior is a separate, pre-existing backend gap worth fixing independent of this UI work.

## 3. `design/live_job_tracking` — no live location/telephony/provider-profile data exists

The mockup shows a live map with a moving provider marker, an animated route line, "Arriving in 12 mins" / "3.2 km", a provider profile card (photo, name, verified badge, vehicle + license plate), and a working "Call Provider" button.

The real active-job view model (`active-job-presenter.ts`) only exposes: booking status/timeline (`submitted → accepted → completed`), `requestedService`, a raw `providerUserId` (no display name, no photo, no rating), a payment summary, and a real "Message" action (`/messenger` route genuinely exists and works). There is no GPS/location tracking, no distance/ETA calculation, no vehicle/license-plate field on any model, and no telephony integration anywhere in the app.

Not yet built pending this decision.

## 4. Question for the sponsor (Marko)

These two mockups imply a materially bigger product than "customer requests a job, provider completes it, a flat fee is auto-charged" — specifically: **saved payment methods with pre-job checkout**, **live GPS tracking of providers**, **in-app calling**, and **rich provider profile data (photo, name, rating, vehicle)** surfaced to the customer mid-job.

Relates directly to already-open items in `07_Risks-Assumptions-Issues-and-Plan-Corrections.md` — I-05 (pricing/quote model), I-06 (payments/compliance model), and gap #3 in §7 ("Is the platform or the provider the merchant of record?"). This finding is a concrete, screen-level instance of those same open questions, surfaced by trying to build against them.

Two independent decisions:
1. **Is pre-job checkout-with-saved-cards and live GPS tracking actually in scope for this phase**, or were these mockups aspirational/future-phase and the flat-rate-post-completion model is the intended near-term product? If the latter, the mockups likely need a corrected pass (or an explicit "future phase" label) rather than being treated as buildable specs.
2. **If they are in scope now**, that's backend/product work (payment method storage + a real checkout endpoint; a location-tracking data source; a calling/telephony integration; provider profile fields) that needs its own planning before a frontend design-parity ticket can be cut — these two are not frontend-only slices like TEC-93/94/95 were.

## 5. Status of in-flight work

Not blocked: `provider_dashboard`, `admin_dashboard`, and `messenger` (Phase 6+) don't show the same signature (mockup implying backend capability that doesn't exist) on first read and remain reasonable next slices while this is decided.
