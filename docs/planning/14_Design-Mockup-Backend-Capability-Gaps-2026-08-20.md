# Design Mockup vs. Backend Capability Gaps (2026-08-20)

## 1. Purpose

While executing the UI redesign migration (`13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`) screen-by-screen — TEC-93 (home), TEC-94 (service categories), TEC-95 (booking flow) shipped so far — two of the next screens in Phase 4/5 turned out to depict product capabilities that don't exist anywhere in the backend today, not just visual/structural gaps. This doc originally flagged the pattern as a possible reason to pause; **resolved 2026-08-20 (Kenny): this is a minimal MVP/demo build, not a fixed ceiling — when an approved design calls for more than the backend currently does, the correct response is to plan and build the capability, not skip the screen or silently descope it.** The rest of this doc records the resulting scope and fidelity decisions.

## 2. `design/payment_checkout` — build toward it, simulated payment processing

The mockup is a pre-job "Checkout" screen: pick a payment method (Apple Pay or a saved Visa card), see an itemized total (call-out fee + labor + platform fee), tap "Pay Securely $227.50".

Current backend: payment is captured automatically **after** a booking is marked `completed`, at a flat hardcoded `estimatePaymentAmountCents()` (12000 cents regardless of requested service), with no payment-method storage anywhere.

**Decision:** build a real pre-job checkout flow end-to-end, with **simulated payment processing** (no real Stripe/Apple Pay integration) — a new payment-method domain module storing a fake label/last4 per customer, no real card data ever touching the server. Consistent with how payment capture already works today (recorded, not actually processed by an external processor). A real card-processor integration is a separate, much larger scope decision (PCI-relevant data flow, account setup, compliance) not undertaken here. `estimatePaymentAmountCents`'s hardcoded flat rate is superseded by a real itemized pricing table as part of this work, not left as a second parallel pricing path.

## 3. `design/live_job_tracking` — build toward it, mostly already real

The mockup shows a live map with a moving provider marker, an animated route line, "Arriving in 12 mins" / "3.2 km", a provider profile card (photo, name, verified badge, vehicle + license plate), and a working "Call Provider" button.

Scoping this turned out cheaper than the payment side — most pieces are already real or small additions:
- **Rating**: already real data (`reviews` module has real per-provider ratings) — just needs aggregating.
- **Provider name/bio**: already real (`ProviderProfile.displayName`, `.bio`).
- **Phone/calling**: the phone number already exists (used for OTP login) but isn't currently persisted as a retrievable field on the user record — small addition, gated behind an authorized lookup (see below).
- **Provider photo**: no field yet, but the existing verification-document upload-url pattern extends cleanly to a profile photo.
- **Vehicle + license plate**: two new optional fields, small.
- **Live GPS/ETA/distance**: the one genuinely missing subsystem — no geo concept anywhere in the codebase. **Decision: simulated en-route status feed** (server-side synthetic but consistent ETA/distance countdown once a booking is `accepted`), not real device GPS tracking. This must be marked as simulated at the code level (a `ponytail:`-style comment on the state machine, not just a line in this doc) so it isn't mistaken for real telemetry later.

**Privacy note carried into execution:** persisting and exposing phone numbers between customer and provider is a real risk if scoped wrong. The lookup must be authorized only when the requester is a party to that specific booking **and** its status is `accepted`; never exposed on `submitted`/`declined`; never returned from any list endpoint. This gets its own PR and its own denial-path test, not bundled into a larger diff.

## 4. Execution sequence

Split by vertical capability (backend + the frontend that consumes it, shipped together), not by backend/frontend layer — a backend-only PR adding five unrelated fields with no consumer isn't reviewable or verifiable.

1. **Provider identity on active-job** — rating aggregate, photo field + upload, vehicle/plate, rendered into the active-job screen.
2. **Contact provider** — persisted phone + authorized/accepted-only lookup + `tel:` link. Separate PR: the privacy gate is the entire risk surface.
3. **Simulated en-route feed** — ETA/distance state machine + the map/ETA section of the screen, explicitly marked as simulated.
4. **Payment**: pricing table → payment-method storage → pre-job checkout endpoint → `/checkout` screen (`design/payment_checkout`).

Tracking (1–3) goes first — cheaper, mostly already real.

## 5. Noted, not chased

`design/review_rating` — the `reviews` backend module already exists and looks unexplored as its own screen; a plausible cheap win later, not part of this sequence.

`provider_dashboard`, `admin_dashboard`, and `messenger` (Phase 6+) don't show the same signature (mockup implying backend capability that doesn't exist) on first read.
