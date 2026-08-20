# TEC-94: Service categories screen design parity

## Issue

TEC-93's PR explicitly deferred `design/service_categories/code.html` — on inspection it's not the provider-list screen `discovery-screen.js` already is, it's a dedicated category-grid picker: top app bar, hero ("What service do you need today?" + a simulated booking-progress bar), a search bar, a 2/3/4-col grid of 8 category tiles (Notfall/emergency is a distinct red-bordered pulsing tile; the other 7 are a uniform style), and a "Premium Plus" promo banner. This ticket builds that screen and gives it a real entry point, closing the gap the TEC-93 PR description promised as a follow-up.

- **Acceptance criteria:**
  1. New screen matching `design/service_categories/code.html` structurally: header, hero copy, search bar, 8-tile category grid (Emergency distinct/pulsing, 7 uniform), promo banner.
  2. 8 category ids, English labels (translated from the mockup's German — matches this app's existing English UI convention, `home-triage-screen.js` already substitutes "QuickWerk" for the mockup's "Handwerker"): Emergency, Plumbing, Electrical, Carpentry, Locksmith, Painting, Cleaning, Handyman. Reuses existing ids (`plumbing`, `electrical`, `carpenter`, `painting`, `emergency` — introduced in TEC-93's chip row and SOS button) plus 3 new ones (`locksmith`, `cleaning`, `handyman`). All fall through `booking-wizard-screen.js`'s `STEPS_BY_CATEGORY[category] ? category : 'default'` safely (only `plumbing`/`electrical` have dedicated step sets today — confirmed by reading the file, not assumed).
  3. Tapping a tile routes to `/booking-wizard?category=<id>`, same pattern as the home screen's chips and SOS button.
  4. Real entry point: the home screen's floating search bar has a `tune` filter-icon button that's currently a no-op decorative element (`home-triage-screen.js`'s `SearchBar` component). Wire it to navigate to the new screen — gives this screen an actual path into the app without touching the bottom tab nav (still a separate, deferred app-shell ticket — only 3 of 4 mockup tabs have real destinations today, no customer Profile route exists).
  5. `pnpm --filter @quickwerk/product-app typecheck` and `test` pass; `pnpm -r typecheck` clean.
  6. Browser-driven verification via `.claude/skills/browser-drive`: tap the filter button on `/home-triage`, confirm the new screen renders with all 8 tiles, tap a tile, confirm it routes into `/booking-wizard` with the right category, no console errors.

## Branch

`feature/tec-94-service-categories-design-parity`

## Already done (confirmed, do not rebuild)

- `booking-wizard-screen.js`'s category fallback mechanism — already handles arbitrary category ids safely, verified in TEC-93, no changes needed here.
- `home-triage-screen.js`'s `SearchBar` component and its `tune`-icon button — exists already as a no-op `View`; this ticket makes it a real `Pressable` wired to navigation, not a rebuild of the search bar itself.
- `packages/ui` tokens — reused as-is, no new tokens needed (grid tiles use the same card/surface/outline tokens already established).

## Plan (frontend only)

- New file `apps/product-app/src/features/marketplace/service-categories-screen.js`: exports `ServiceCategories({ onSelectCategory, onBack })`.
  - Header: back button (reuses the back-chevron pattern already used in `payout-screen.js`/other gated screens) + "Choose a service" title + profile avatar circle (reuse the treatment from `home-triage-screen.js`'s `Header`).
  - Hero: heading + subtext + a thin progress-bar decoration (static, matches mockup's "step 1 of booking" visual — no real multi-step state here, it's decorative in the mockup too).
  - Search bar: reuse the same non-functional placeholder pattern as `home-triage-screen.js`'s `SearchBar` (same "no search backend yet" boundary already established there).
  - Category grid: `View` with `flexWrap: 'wrap'`, 8 tiles (2-column on narrow width via percentage widths, matching the `ServiceCard` `48.8%` pattern already used elsewhere in this codebase rather than inventing a new responsive-grid mechanism). Emergency tile gets the distinct red-accent/pulsing-dot treatment (static dot, no animation loop — same "decorative CSS animation skipped" call TEC-93 made for the map markers).
  - Promo banner: static card, no real "Premium Plus" feature exists — visual parity only, no CTA wired to anything real (same boundary as the search bar).
- `apps/product-app/app/categories.js`: new thin route wrapper, same pattern as `app/payouts.js` — renders `ServiceCategories` with `onSelectCategory` pushing to `/booking-wizard` and `onBack` calling `router.back()`.
- `apps/product-app/src/features/marketplace/home-triage-screen.js`: `SearchBar`'s filter button becomes a `Pressable` calling a new `onOpenCategories` prop; `HomeTriage` gains that prop; `apps/product-app/app/home-triage.js` wires it to `router.push('/categories')`.

## Not in scope

- Bottom tab nav app-shell (still deferred, unrelated to this ticket).
- Real search/filter backend behind the search bar or promo banner CTA.
- Booking-progress-bar real state — decorative only, matching the mockup itself (it's a static `w-1/4` bar in the mockup, not driven by real step state).
- No screen-level tests — confirmed zero screen-level tests exist anywhere in this repo (established in TEC-90), not inventing that convention here.

## Verification

```bash
pnpm --filter @quickwerk/product-app typecheck
pnpm --filter @quickwerk/product-app test
pnpm -r typecheck
```

Plus browser-driven check via `.claude/skills/browser-drive`: from `/home-triage`, tap the filter button, confirm `/categories` renders all 8 tiles, tap one, confirm routing into `/booking-wizard`, no console errors.
