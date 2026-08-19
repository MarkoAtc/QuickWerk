---
name: browser-drive
description: Drive QuickWerk's web apps (product-app, admin-web) in headless Chromium for visual QA — nav/click/fill/screenshot/console, since no chromium-cli is installed in this environment. Use whenever a change needs actual browser verification, not just typecheck/tests.
---

# Browser-drive QuickWerk (headless Chromium / Playwright)

This repo's sandbox has no `chromium-cli` available. This skill is the
fallback recorded per the `run` skill's guidance: a thin Playwright REPL
driver (`drive.mjs` in this folder) with the same shape as `chromium-cli`
(`nav` / `wait-for` / `click` / `fill` / `press` / `screenshot` / `console`).

Confirmed working in this WSL2 environment 2026-08-19: headless Chromium
launches with no missing-lib errors (`--no-sandbox` only), so no `sudo
apt-get` was needed. If a fresh environment fails on missing shared libs
(`libnss3`, `libatk-1.0`, `libgbm1`, `libasound2`), that needs `sudo` —
stop and ask the user rather than guessing package names.

## One-time setup (per environment, NOT a repo dependency)

Playwright + its ~300MB Chromium download do **not** belong in
`package.json`/`pnpm-lock.yaml` — install them into a scratch directory
outside the repo:

```bash
mkdir -p /tmp/qw-browser-tool && cd /tmp/qw-browser-tool
npm init -y >/dev/null
npm i playwright
npx playwright install chromium
```

Re-run `npx playwright install chromium` if the cache (`~/.cache/ms-playwright`)
was cleared; `npm i playwright` is a no-op if `node_modules` already exists there.

## Running the driver

From the scratch dir created above (so `require('playwright')` resolves):

```bash
REPO_DIR=/path/to/QuickWerk   # this repo's checkout root
node "$REPO_DIR/.claude/skills/browser-drive/drive.mjs" <<'EOF'
nav http://localhost:8081/auth
wait-for text=Enter your phone
screenshot phone-entry
console --errors
quit
EOF
```

Screenshots land in `<cwd>/screenshots/`. Run from the scratch dir (or
`cd` there first) so they don't land in the repo.

## Command reference

| Command | Effect |
|---|---|
| `nav <url>` | Navigate |
| `wait-for text=<substring>` | Wait for visible text (15s timeout) |
| `wait-for <css selector>` | Wait for selector |
| `click <css selector>` | Click first match |
| `fill <css selector> <text>` | Set an input's value via Playwright's fill (fires React's onChange, unlike a raw `eval el.value=`) |
| `press <key>` | Keyboard press (e.g. `Enter`) |
| `screenshot [name]` | Save PNG to `screenshots/` |
| `console` / `console --errors` | Print & clear collected console/page-error messages since last call |
| `text <css selector>` | Print an element's `innerText` (e.g. to read a displayed value) |
| `type-digits-from <source selector> <keypad testid prefix>` | Extract digits from a source element's text and click matching `[data-testid="<prefix>-<digit>"]` keys in order — for driving on-screen numeric keypads (e.g. QuickWerk's OTP flow) from a value the page itself displays, in one browser session/process instead of round-tripping through the shell |
| `quit` | Close browser, exit |

## Starting the apps to drive

```bash
# from repo root
pnpm --filter @quickwerk/platform-api dev        # NestJS, defaults to port 3000 (PORT env overrides), in-memory persistence
pnpm --filter @quickwerk/product-app dev:web      # Expo web, port 8081; apps/product-app/.env already points
                                                   # EXPO_PUBLIC_PLATFORM_API_BASE_URL(_WEB) at localhost:3000
pnpm --filter @quickwerk/admin-web dev            # Next.js, port 3001
```

Poll instead of sleeping: `until curl -sf http://localhost:8081 >/dev/null; do sleep 1; done`.
Stop with `lsof -ti:<port> -sTCP:LISTEN | xargs -r kill` before relaunching (avoid `pkill -f`, it can
match the agent's own process).

## Product-app testIDs (react-native-web renders these as `data-testid` / matchable text)

The product-app screens use `testID` extensively — in the web DOM these
resolve to attributes Playwright can select. Prefer `text=` waits/clicks
for user-visible copy; for RN-specific `testID`s, use
`[data-testid="…"]` if the element renders one, otherwise fall back to
role/text locators.

## Known gotchas

- **First `nav` after starting Expo can take 60-100s** — Metro bundles on
  demand. `wait-for` with its 15s timeout may need a longer explicit
  first wait; consider polling the bundle URL with `curl` before `nav`
  (see the `run` skill's server-warm-up pattern) rather than raising the
  driver's timeout blindly.
- **Controlled inputs**: use `fill`, not manual DOM manipulation — this
  driver's `fill` goes through Playwright's real input pipeline so
  React's `onChange` fires.
- Always check `console --errors` before declaring a flow verified — a
  screen can render its shell while an API call underneath fails.
