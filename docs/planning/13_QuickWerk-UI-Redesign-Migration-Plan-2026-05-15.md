# QuickWerk UI Redesign Migration Plan (2026-05-15)

## 1. Goal

Replace the current QuickWerk MVP-style frontend presentation with the new Stitch design system located in `/home/marko/.openclaw/workspace/QuickWerk/design`, while preserving the already implemented product logic, route structure, and backend integrations.

This is a UI migration and component-system refactor, not a product rewrite.

---

## 2. Current project structure

### Product app
- Path: `apps/product-app`
- Runtime: Expo Router + React Native + react-native-web
- Purpose: Shared product experience for web, iOS, and Android

### Admin web
- Path: `apps/admin-web`
- Runtime: Next.js
- Purpose: Internal operator/admin dashboard

### Shared UI package
- Path: `packages/ui`
- Current role: basic tokens only (colors, spacing, radius, typography, shadow)
- Future role: actual shared design-system foundation for both product and admin surfaces where practical

### Backend and shared contracts
- `services/platform-api`
- `packages/api-client`
- `packages/domain`
- `packages/auth`

Important: these should remain stable during the UI redesign unless a screen requires a small integration adjustment.

---

## 3. What the current frontend looks like

## 3.1 Product app

Current patterns:
- Routes in `apps/product-app/app/*.js`
- Feature screens in `apps/product-app/src/features/**`
- Layout and shells in `apps/product-app/src/shared/**`
- Styling is mostly inline React Native style objects
- Low number of reusable visual components
- Feature organization is acceptable, but visual architecture is weak

Current primary product screens/components:
- `app/auth.js`
- `app/home-triage.js`
- `app/discovery.js`
- `app/booking-wizard.js`
- `app/booking.js`
- `app/active-job.js`
- `app/provider.js`
- `app/provider-onboarding.js`
- `app/provider-profile.js`
- `app/provider-detail.js`
- `app/marketplace-preview.js`

Representative feature files:
- `src/features/auth/auth-entry-screen.js`
- `src/features/marketplace/home-triage-screen.js`
- `src/features/discovery/discovery-screen.js`
- `src/features/booking/booking-wizard-screen.js`
- `src/features/booking/active-job-screen.js`
- `src/features/provider/provider-screen.js`
- `src/features/provider/provider-onboarding-screen.js`

## 3.2 Admin web

Current patterns:
- Main page currently rendered in `apps/admin-web/src/app/page.js`
- Business logic split into queue action/state modules
- Visual layer is functional but mostly inline CSS and simple cards/forms
- Works as an internal tool, but visually does not match the new premium Stitch direction

---

## 4. New Stitch design input

Design source folder:
- `/home/marko/.openclaw/workspace/QuickWerk/design`

Included target areas:
- `authentication`
- `home_screen_live_map`
- `booking_flow`
- `live_job_tracking`
- `messenger`
- `onboarding_flow`
- `payment_checkout`
- `provider_dashboard`
- `provider_profile`
- `review_rating`
- `service_categories`
- `splash_screen`
- `admin_dashboard_desktop`
- `design_system/DESIGN.md`

## 4.1 Design direction summary

The new design is:
- premium and productized
- mobile-first
- Inter-based
- high-contrast with dark primary surfaces and electric blue/orange accents
- heavier use of layered cards, glassmorphism, chips, overlays, progress states, and refined spacing
- visually much closer to a modern marketplace app than the current MVP UI

## 4.2 Technical reality

The Stitch screens are delivered as HTML + Tailwind-oriented prototypes.

This means:
- Product app screens cannot be pasted directly into Expo/React Native
- Admin web concepts can be translated more directly into Next.js React components
- We should treat the HTML as visual reference and component blueprint, not as final implementation code for the product app

---

## 5. Core migration strategy

## 5.1 Principle

Do not rewrite product logic.

Keep:
- routes
- feature state/actions
- API integrations
- backend contract behavior

Replace/refactor:
- visual shells
- reusable UI primitives
- screen composition
- spacing/color/typography system
- layout patterns

## 5.2 High-level approach

1. Extract the design language into a real shared UI foundation
2. Build reusable components first
3. Rebuild the key customer-facing flows on top of those components
4. Migrate provider flows
5. Migrate admin dashboard last

---

## 6. Screen mapping: current app to new design

## 6.1 Product app mapping

### Authentication
Current:
- `apps/product-app/app/auth.js`
- `apps/product-app/src/features/auth/auth-entry-screen.js`
- `apps/product-app/src/features/auth/sign-in-screen.js`

Target design:
- `design/authentication/code.html`
- optional brand entry cues from `design/splash_screen/code.html`

### Home / Discovery / Category entry
Current:
- `apps/product-app/app/home-triage.js`
- `apps/product-app/src/features/marketplace/home-triage-screen.js`
- `apps/product-app/app/discovery.js`
- `apps/product-app/src/features/discovery/discovery-screen.js`

Target design:
- `design/home_screen_live_map/code.html`
- `design/service_categories/code.html`

### Booking flow
Current:
- `apps/product-app/app/booking-wizard.js`
- `apps/product-app/src/features/booking/booking-wizard-screen.js`
- parts of `apps/product-app/app/booking.js`

Target design:
- `design/booking_flow/code.html`
- `design/payment_checkout/code.html`

### Live job / active booking status
Current:
- `apps/product-app/app/active-job.js`
- `apps/product-app/src/features/booking/active-job-screen.js`
- `apps/product-app/app/booking-completion.js`

Target design:
- `design/live_job_tracking/code.html`
- some confirmation/payment pieces from `design/payment_checkout/code.html`

### Provider workspace
Current:
- `apps/product-app/app/provider.js`
- `apps/product-app/src/features/provider/provider-screen.js`
- `apps/product-app/app/provider-onboarding.js`
- `apps/product-app/src/features/provider/provider-onboarding-screen.js`

Target design:
- `design/provider_dashboard/code.html`
- `design/onboarding_flow/code.html`

### Provider profile / details / ratings
Current:
- `apps/product-app/app/provider-profile.js`
- `apps/product-app/app/provider-detail.js`
- `apps/product-app/src/features/discovery/provider-detail-screen.js`
- `apps/product-app/src/features/marketplace/provider-profile-screen.js`

Target design:
- `design/provider_profile/code.html`
- `design/review_rating/code.html`

### Messaging
Current:
- likely incomplete or future-facing surface

Target design:
- `design/messenger/code.html`

## 6.2 Admin web mapping

Current:
- `apps/admin-web/src/app/page.js`

Target design:
- `design/admin_dashboard_desktop/code.html`

Potential follow-up decomposition:
- dashboard shell
- provider management table
- disputes rail
- payouts rail
- analytics cards
- side navigation

---

## 7. Recommended implementation phases

## Phase 0: Audit and foundation preparation

### Objective
Prepare the codebase so redesign work is structured instead of ad hoc.

### Tasks
- document current screen-to-design mapping
- identify reusable visual patterns across Stitch screens
- define which elements belong in `packages/ui`
- decide naming conventions for product UI primitives
- decide whether to keep inline styles or migrate to centralized style modules/component wrappers

### Output
- this migration plan
- component inventory
- agreed token/component naming

---

## Phase 1: Build the shared design foundation

### Objective
Upgrade `packages/ui` from token-only to actual design foundation.

### Tasks
- replace current token values with Stitch-aligned tokens
- add new semantic color groups
- add typography scale matching `design_system/DESIGN.md`
- add elevation utilities
- add shared radius and spacing helpers
- add status color system
- add reusable component primitives

### Candidate primitives to add
- `ScreenContainer`
- `TopBar`
- `BottomNav`
- `PrimaryButton`
- `SecondaryButton`
- `GhostButton`
- `TextField`
- `SearchField`
- `Chip`
- `StatusChip`
- `ProgressBar`
- `StatCard`
- `ProviderCard`
- `SectionCard`
- `BottomSheetCard`
- `Avatar`
- `IconBadge`

### Files likely affected
- `packages/ui/src/index.ts`
- new files under `packages/ui/src/*` if package structure is expanded
- product app shared shell files under `apps/product-app/src/shared/*`

### Notes
For the product app, these primitives must remain React Native compatible.

---

## Phase 2: Rebuild authentication and app shell

### Objective
Replace the weakest first-impression screens first.

### Tasks
- redesign auth entry using Stitch authentication look and feel
- introduce top-level app shell patterns
- establish navigation/header treatment
- create reusable glass / dark hero / CTA patterns where feasible in React Native

### Files likely affected
- `apps/product-app/app/auth.js`
- `apps/product-app/src/features/auth/auth-entry-screen.js`
- `apps/product-app/src/features/auth/sign-in-screen.js`
- `apps/product-app/src/shared/product-screen-shell.js`
- `apps/product-app/src/shared/app-shell.ts`

### Outcome
A visually convincing starting point for demos and stakeholder review.

---

## Phase 3: Rebuild home, discovery, and category entry

### Objective
Modernize the core marketplace browsing experience.

### Tasks
- redesign home/triage screen based on live-map concept
- redesign provider discovery list and filters
- integrate service categories UI style
- decide how much of the map experience is static placeholder vs functional live map for now
- align provider cards, chips, and CTA hierarchy to Stitch

### Files likely affected
- `apps/product-app/app/home-triage.js`
- `apps/product-app/app/discovery.js`
- `apps/product-app/src/features/marketplace/home-triage-screen.js`
- `apps/product-app/src/features/discovery/discovery-screen.js`
- `apps/product-app/src/features/discovery/provider-detail-screen.js`

### Risks
- Map behavior in Stitch is visual-first, while app logic is currently simpler
- We may need to stage map realism separately from full UI restyling

---

## Phase 4: Rebuild booking flow and confirmation/payment

### Objective
Bring the booking experience to the new premium transactional standard.

### Tasks
- redesign issue selection and urgency steps
- redesign location confirmation
- redesign confirmation/payment sections
- keep current submission logic intact
- add booking progress indicator matching Stitch

### Files likely affected
- `apps/product-app/app/booking-wizard.js`
- `apps/product-app/src/features/booking/booking-wizard-screen.js`
- `apps/product-app/src/features/booking/booking-screen.js`
- `apps/product-app/app/booking-completion.js`
- `apps/product-app/src/features/booking/booking-completion-screen.js`

### Outcome
The most important customer conversion funnel looks polished and intentional.

---

## Phase 5: Rebuild active job and post-booking service flow

### Objective
Make the “job in progress” state feel real, trackable, and premium.

### Tasks
- redesign active job screen using live tracking concepts
- improve booking status hierarchy
- align action buttons, provider info, and status chips
- integrate review/rating visual patterns where relevant

### Files likely affected
- `apps/product-app/app/active-job.js`
- `apps/product-app/src/features/booking/active-job-screen.js`
- `apps/product-app/src/features/booking/review-*`

---

## Phase 6: Rebuild provider-side flows

### Objective
Bring provider experience to the same standard as customer flow.

### Tasks
- redesign provider dashboard
- redesign onboarding flow
- redesign provider profile views
- preserve booking accept/decline and gating logic

### Files likely affected
- `apps/product-app/app/provider.js`
- `apps/product-app/src/features/provider/provider-screen.js`
- `apps/product-app/app/provider-onboarding.js`
- `apps/product-app/src/features/provider/provider-onboarding-screen.js`
- `apps/product-app/app/provider-profile.js`
- related provider state/presenter files if UI needs stronger separation

---

## Phase 7: Rebuild admin web to match new desktop dashboard design

### Objective
Replace utilitarian admin UI with a cleaner operator dashboard.

### Tasks
- create admin shell with sidebar and dashboard cards
- refactor monolithic page into reusable sections/components
- map existing provider/dispute/finance queue logic into new layout
- preserve server actions and queue behavior

### Files likely affected
- `apps/admin-web/src/app/page.js`
- `apps/admin-web/src/admin-shell.ts`
- new reusable admin components under `apps/admin-web/src/features/dashboard/*`

### Notes
This is easier than product-app migration because the source design is already HTML/web-shaped.

---

## 8. Recommended order of execution

### Priority order
1. Design foundation (`packages/ui`)
2. Auth screens
3. Home / discovery
4. Booking flow
5. Active job
6. Provider dashboard / onboarding
7. Admin dashboard
8. Messenger / secondary surfaces

### Why this order
- fastest visible improvement for stakeholders
- strongest customer-facing impact first
- reduces risk by building shared primitives before deep screen work
- preserves existing feature logic while upgrading visual quality in layers

---

## 9. Implementation guidelines

## 9.1 Product app guidelines
- Do not attempt to paste HTML directly into Expo screens
- Recreate layouts as React Native components
- Prefer reusable visual primitives over repeating inline style blobs
- Keep route contracts and screen behavior stable
- If a screen mixes too much logic and presentation, separate them while redesigning

## 9.2 Admin web guidelines
- HTML structure from Stitch can be used as a stronger reference for direct component conversion
- break `page.js` into smaller reusable dashboard sections
- preserve existing queue data loading and form actions

## 9.3 Shared design rules
- Inter becomes the visual baseline
- use the new color system consistently
- reserve orange for primary CTA emphasis
- standardize chips, cards, nav, and action hierarchy
- keep mobile-first spacing discipline

---

## 10. Risks and mitigation

### Risk 1: UI rewrite accidentally breaks feature behavior
Mitigation:
- keep business logic and API calls unchanged where possible
- only swap screen composition and component layers first

### Risk 2: Stitch web visuals do not translate 1:1 to React Native
Mitigation:
- treat Stitch as design reference, not literal source code
- approximate blur/glass effects pragmatically where native parity is limited

### Risk 3: design inconsistency during transition
Mitigation:
- complete shared primitives first
- migrate by flow, not random screen-by-screen edits

### Risk 4: admin and product diverge visually
Mitigation:
- maintain one token system and one design language, even if components differ by platform

---

## 11. Definition of done

The redesign is considered successful when:
- core customer flows visually match the new Stitch direction
- provider dashboard/onboarding is migrated
- admin dashboard is migrated to the new desktop shell
- legacy MVP green/soft design language is removed
- the product keeps its current working functionality while presenting a coherent premium UI system

---

## 12. Immediate next action recommendation

Start with a narrow but high-leverage first implementation slice:

### First slice
1. update `packages/ui` tokens and primitives
2. redesign auth screen
3. redesign home/triage screen

This gives the fastest visible transformation and establishes the component vocabulary for the rest of the app.

---

## 13. Plan location

Canonical file:
- `QuickWerk/docs/planning/13_QuickWerk-UI-Redesign-Migration-Plan-2026-05-15.md`

Reference design folder:
- `QuickWerk/design/`
