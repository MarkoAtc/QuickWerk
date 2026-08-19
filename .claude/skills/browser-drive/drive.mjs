#!/usr/bin/env node
// Minimal headless-Chromium REPL driver for QuickWerk (Playwright).
// Reads one command per line from stdin. See SKILL.md for the full reference.
//
// Commands:
//   nav <url>
//   wait-for text=<substring> | <css selector>   (5s default timeout)
//   click <css selector>
//   fill <css selector> <text>
//   press <key>                                  (e.g. Enter, Backspace)
//   screenshot [name]                             -> screenshots/<name-or-seq>.png
//   console                                       -> print collected console messages since last call
//   console --errors                              -> print only error-level messages
//   quit
//
// Requires `playwright` + a downloaded chromium build available on
// require.resolve — see SKILL.md for one-time setup (installed outside
// the repo, not a QuickWerk dependency).

import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Bare `import 'playwright'` resolves relative to THIS file's location, not
// cwd — but playwright is intentionally installed in a scratch dir outside
// the repo (see SKILL.md), not next to this script. createRequire(cwd)
// restores cwd-based resolution so `cd <scratch-tool-dir>` before running
// this script is enough, same as CommonJS `require` would behave.
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const screenshotDir = path.join(process.cwd(), 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await context.newPage();

let consoleLog = [];
page.on('console', (msg) => {
  consoleLog.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => {
  consoleLog.push({ type: 'pageerror', text: err.message });
});

let shotSeq = 0;
let failed = false;

const rl = readline.createInterface({ input: process.stdin, terminal: false });

for await (const rawLine of rl) {
  const line = rawLine.trim();
  if (!line) continue;

  const [cmd, ...rest] = line.split(' ');

  try {
    switch (cmd) {
      case 'nav': {
        await page.goto(rest.join(' '), { waitUntil: 'domcontentloaded' });
        console.log(`[nav] ok -> ${page.url()}`);
        break;
      }
      case 'wait-for': {
        const target = rest.join(' ');
        if (target.startsWith('text=')) {
          await page.getByText(target.slice(5), { exact: false }).first().waitFor({ timeout: 15000 });
        } else {
          await page.waitForSelector(target, { timeout: 15000 });
        }
        console.log(`[wait-for] ok: ${target}`);
        break;
      }
      case 'click': {
        await page.locator(rest.join(' ')).first().click();
        console.log(`[click] ok: ${rest.join(' ')}`);
        break;
      }
      case 'fill': {
        const [selector, ...text] = rest;
        await page.locator(selector).first().fill(text.join(' '));
        console.log(`[fill] ok: ${selector}`);
        break;
      }
      case 'press': {
        await page.keyboard.press(rest.join(' '));
        console.log(`[press] ok: ${rest.join(' ')}`);
        break;
      }
      case 'screenshot': {
        const name = rest.join(' ') || `shot-${++shotSeq}`;
        const filePath = path.join(screenshotDir, `${name}.png`);
        await page.screenshot({ path: filePath });
        console.log(`[screenshot] saved: ${filePath}`);
        break;
      }
      case 'console': {
        const errorsOnly = rest[0] === '--errors';
        const entries = errorsOnly ? consoleLog.filter((e) => e.type === 'error' || e.type === 'pageerror') : consoleLog;
        if (entries.length === 0) {
          console.log('[console] (none)');
        } else {
          entries.forEach((e) => console.log(`[console:${e.type}] ${e.text}`));
        }
        consoleLog = [];
        break;
      }
      case 'text': {
        const selector = rest.join(' ');
        const content = await page.locator(selector).first().innerText();
        console.log(`[text] ${selector} -> ${content}`);
        break;
      }
      case 'type-digits-from': {
        // Reads digits out of a source element's text and clicks matching
        // [data-testid="<prefix>-<digit>"] keys in order — for driving
        // on-screen numeric keypads from a displayed code/value.
        const [sourceSelector, testIdPrefix] = rest;
        const content = await page.locator(sourceSelector).first().innerText();
        const digits = content.match(/\d/g) ?? [];
        for (const digit of digits) {
          await page.locator(`[data-testid="${testIdPrefix}-${digit}"]`).first().click();
        }
        console.log(`[type-digits-from] typed ${digits.join('')} from ${sourceSelector}`);
        break;
      }
      case 'quit': {
        await browser.close();
        process.exit(failed ? 1 : 0);
        break;
      }
      default:
        failed = true;
        console.log(`[error] unknown command: ${cmd}`);
    }
  } catch (error) {
    failed = true;
    console.log(`[error] ${cmd} failed: ${error.message}`);
  }
}

await browser.close();
process.exitCode = failed ? 1 : 0;
