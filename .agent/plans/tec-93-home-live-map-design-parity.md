# TEC-93: Home screen live-map design parity

## Issue

Marko's migration plan's next slice after auth (TEC-91/92 merged) is home/discovery. `home-triage-screen.js` is currently a plain `ScrollView` marketing page with a static `LiveMapPreview()` card and hardcoded fixture arrays (`SERVICE_CATEGORIES`, `TRUST_HIGHLIGHTS`, `CURATED_MATCHES`) — same "reskinned but not restructured" gap found in auth before TEC-91. The approved mockup (`design/home_screen_live_map/code.html`) is a full-screen immersive layout: fixed header, full-bleed map background with animated provider markers, floating glassmorphism search bar, horizontal category chips, a fixed SOS button, and a bottom snap-scroll provider-card carousel over a fixed bottom nav.

**Scope note:** the user's ask also named `design/service_categories/code.html` as in-scope for "home/discovery parity." On inspection that mockup is a different screen than expected — it's a dedicated category-grid picker (German-language "Search" tab destination: hero + search bar + 8-category grid + promo banner), not the provider-list-with-filters screen `discovery-screen.js` currently is. It doesn't map cleanly onto either existing file. Rebuilding it means either inventing a new route or overhauling `discovery-screen.js`'s actual purpose — a separate decision from "make home match its mockup." This ticket covers `home-triage-screen.js` only; `service_categories` parity is left as a follow-up so it can be scoped on its own terms instead of forced into this slice.

Also out of scope: the fixed bottom tab nav in the mockup (Home/Search/Jobs/Profile) is an app-shell concern spanning every route (`app/_layout.js` is currently a bare `<Stack>`), and only 3 of 4 tabs have a real destination today (Home→home-triage, Search→discovery, Jobs→booking; no customer Profile route exists). That's its own ticket, not smuggled in here.

- **Acceptance criteria:**
  1. `home-triage-screen.js` renders as a full-screen (not scrolling-page) layout: fixed header, map-background main area, floating search bar + category chips, fixed SOS button, bottom snap-scroll provider carousel — structurally matching `design/home_screen_live_map/code.html`.
  2. No new image assets/dependencies. The mockup's map/provider photos are `lh3.googleusercontent.com` placeholder URLs, not usable — background rendered as an abstract map treatment (flat color + grid/block pattern) using the same `View`-composition technique the current `LiveMapPreview` already uses for its placeholder background, just filling the screen instead of a card.
  3. Category chips: 4 entries (Plumber/Electrician/Carpenter/Painter), first one shown selected/filled per the mockup, tapping still routes to `onSelectCategory` → `/booking-wizard` (existing behavior, `home-triage.js` wrapper unchanged).
  4. Bottom carousel: reuse the existing `CURATED_MATCHES` fixture data (still no live API call here — that stays discovery-screen.js's job, matching the pre-existing convention where curated cards are an established "no live matching API yet" fixture, not a new gap introduced by this ticket), extended with the `distance`/`rate` fields the mockup shows (`2.4km` / `$90/hr` style), rendered as the mockup's photo+name+rating+specialty+distance+rate+"Book Instantly" card.
  5. SOS button present and tappable, routes through `onSelectCategory('emergency')` to `/booking-wizard` (no dedicated emergency-dispatch backend exists yet — this reuses the existing booking-wizard entry point rather than inventing new behavior, and is honest about being a booking-flow entry point rather than aliasing to "browse providers").
  6. `pnpm --filter @quickwerk/product-app typecheck` and `pnpm --filter @quickwerk/product-app test` pass; `pnpm -r typecheck` clean.
  7. Browser-driven verification via `.claude/skills/browser-drive`: navigate to `/home-triage`, confirm the full-screen layout renders, chips are tappable, carousel scrolls horizontally, no console errors.

## Branch

`feature/tec-93-home-live-map-design-parity`

## Already done (confirmed, do not rebuild)

- `apps/product-app/app/home-triage.js`: route wrapper with address-edit bottom sheet, `onSelectCategory`/`onChangeAddress`/`onBrowseProviders` handlers — unchanged, `HomeTriage` component's prop contract stays the same.
- `packages/ui` tokens already match the mockup's palette from the prior showcase pass (`colors.cta` = `#FF8A00` = mockup's SOS orange exactly; `colors.secondaryBright` ≈ mockup's `secondary` blue). No token changes needed.
- Discovery/provider-search backend (`GET /api/v1/providers`) and `discovery-screen.js`'s existing fixture-fallback pattern (`FALLBACK_PROVIDERS`) — untouched, this ticket doesn't touch `discovery-screen.js`.

## Plan (frontend only, single file rewrite)

`apps/product-app/src/features/marketplace/home-triage-screen.js`:

- Drop the current `ScrollView`-page structure (hero headline, `TrustMetric` row, `ServiceCard` grid, separate `LiveMapPreview` card at the bottom). Rebuild `HomeTriage` as a full-screen `View` (`flex: 1`) with:
  - **Header** (fixed-feel, top of screen): "QuickWerk" wordmark/title (renamed from mockup's "Handwerker" — this app's actual brand) left-aligned, existing `AddressPill` reused in place of the mockup's hamburger menu (keeps the existing `onChangeAddress` affordance since there's no menu drawer to build), profile avatar circle on the right (reuse the existing 👤 avatar treatment from the current header).
  - **Map area** (fills remaining screen height): background `View` using flat `colors.surfaceContainer`/`#E5E7EB`-style fill + a light grid-line pattern (reuse `LiveMapPreview`'s existing absolute-positioned-marker technique, generalized to fill the screen) with 3 animated-looking provider label markers (static position, no real animation loop needed — `map-marker-bounce` was a CSS decoration, skip it, note as intentional simplification) showing category+rate chips, same content as today's `LiveMapPreview` providers array, repositioned as percentages.
  - **Floating search bar**: pill/rounded-rect `View` with search icon, a non-functional `TextInput` placeholder "Search for professionals..." (no search backend wired yet — same "visual parity, no new backend" boundary as auth's OTP-verify screen extrapolation), and a filter icon button (no-op, matches mockup's `tune` button which also has no wired behavior in the mockup itself).
  - **Category chips row**: horizontal `ScrollView`, matches the mockup's exact 4 chips: Plumbing/Electrical (existing ids, reused as-is) + new `carpenter`/`painting` ids (mockup shows Carpenter/Painter, which don't exist in the current 4-item taxonomy — `heating`/`cleaning` don't drop from anywhere globally since `SERVICE_CATEGORIES` is local to this file, they just aren't chips on this screen anymore). Verified safe to add new ids: `booking-wizard-screen.js`'s `STEPS_BY_CATEGORY[category] ? category : 'default'` already falls back gracefully for unrecognized categories, so `carpenter`/`painting` route through the generic default step-set with no crash risk. First chip (plumbing) shown selected/filled per mockup. All `onSelectCategory` wired.
  - **Fixed SOS button**: circular, `colors.cta` background, absolute-positioned right-center. Wired to `onSelectCategory('emergency')` → routes through `/booking-wizard?category=emergency` (falls back to default steps, same mechanism as the new carpenter/painting ids) — an actual emergency-flagged booking entry point, not aliased to "browse all providers" which would misrepresent a big orange SOS button as a passive list-browse action.
  - **Bottom carousel**: horizontal `ScrollView`, `CURATED_MATCHES` cards extended with `distance`/`rate` fields, absolute-positioned near the bottom of the screen over the map, each card the mockup's photo-placeholder+name+rating+specialty+distance+rate+"Book Instantly" button, `onBrowseProviders` on tap (no per-provider detail route from this screen today — matches existing behavior where `MatchCard` already only takes one shared handler).
- No changes to `TRUST_HIGHLIGHTS` consumer — dropped entirely, the mockup has no trust-metrics section on this screen (that content doesn't exist in `home_screen_live_map`; if it's still wanted somewhere, that's Marko's call, not invented here).
- No changes to `app/home-triage.js`, `app/_layout.js`, `packages/ui`, or any backend.

## Not in scope

- `service_categories`/category-grid screen — separate follow-up ticket (see Scope note above).
- Bottom tab nav app-shell — separate follow-up ticket.
- Real map SDK / actual geolocation — mockup uses a static placeholder image; this ticket matches that with a static abstract background, not a live map integration.
- Wiring the floating search bar / filter button to real search — no such backend exists yet; visual-only, same boundary precedent as TEC-91.
- New provider fields (photo, live rating, live distance, live hourly rate) — the backend's public provider-discovery model (`serializeProfile` in `providers.service.ts`) only has `displayName/bio/tradeCategories/serviceArea/isPublic`. The carousel keeps using local fixture data with distance/rate as decoration, same fixture-first precedent `discovery-screen.js` already established (`averageRating` optional-with-fallback) — not a new gap.

## Verification

```bash
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus browser-driven check via `.claude/skills/browser-drive`: load `/home-triage`, confirm full-screen layout, tap a category chip (routes to booking-wizard), scroll the bottom carousel, tap SOS (routes to discovery), no console errors.
