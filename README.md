# e2e-playwright

Playwright end-to-end tests for `learning.oreilly.review` (and `learning.oreilly.com` in prod).

## Quick start

```bash
npm install
npx playwright install chromium      # one-time browser download
npm test                              # run the full suite headless in chromium
```

## Common commands

| Command | What it does |
|---|---|
| `npm test` | Full suite, headless, against `review` env |
| `npm run test:headed` | Full suite with a visible browser window |
| `npm run test:ui` | Playwright UI mode — interactive runner with time-travel, locator picker, and watch mode |
| `npm run test:prod` | Run against `learning.oreilly.com` with prod fixtures |
| `npm run test:report` | Open the last HTML report |
| `npx playwright test path/to/spec.js` | Run a single file |
| `npx playwright test path/to/spec.js --debug` | Step through with the Inspector (paused at line 1) |
| `npx playwright test --grep "pattern"` | Run tests by title pattern |
| `npx playwright codegen <url>` | Record interactions into Playwright code |
| `npx playwright show-trace test-results/.../trace.zip` | Inspect a failed run's trace |

## Project structure

```
tests/                  Test specs, grouped by feature area
  a_la_carte/           Per-title purchase flows
  authentication/       Login / signup
  b2b/                  Business self-service (Zuora payment)
  b2c/                  Consumer flows
  courses/              Course consumption
  live-events/          Live event UI
  navigation.spec.js    Cross-page layout checks
  playlists/            Playlist CRUD and permissions
  quizzes/              Quiz purchase + take
  search/               Search results
  UCV-Books/            Book reader (UCV = Unified Content Viewer)
  Usage/                Usage-event simulation specs — verifies /api/v2/usage-event/
                        firing across reading, idle, and navigation scenarios
helpers/auth.js         login(), signup(), VIEWPORTS
fixtures/login.js       Test credentials per env (prod/review)
fixtures/questions.js   Quiz answer fixtures
fixtures/siteUrls.json  Known route fixtures
utils/user.js           createNewUserInfo() — fresh-user factory
docs/superpowers/       Implementation plans + specs (for AI-assisted work)
playwright.config.js    Timeouts, retries, baseURL, snapshot config
```

## Environments

The env is selected by two vars (default = `review`):

```bash
PLAYWRIGHT_ENV=review BASE_URL=https://learning.oreilly.review/  # default
PLAYWRIGHT_ENV=prod   BASE_URL=https://learning.oreilly.com/     # prod
```

`PLAYWRIGHT_ENV` picks the right credential bucket from `fixtures/login.js`. `BASE_URL` is what `page.goto('/foo')` resolves against.

## Authentication

Always log in via the helper rather than typing credentials inline:

```js
const { login, VIEWPORTS } = require('../../helpers/auth');

test.beforeAll(async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.setViewportSize(VIEWPORTS['macbook-15']);
  await login(page, { type: 'b2b' });    // or 'b2c', 'b2bExpiredTrial', etc.
  await page.goto('/library/view/...');
});
```

User types available in `fixtures/login.js`: `b2b`, `b2b2`, `b2b3`, `b2bExpiredTrial`, `b2c`, `producer`, and more. New types are added there, not in the helper.

For self-registration flows that need a fresh account, use a unique email per run:

```js
const uniqueEmail = `qa+myflow-${Date.now()}@oreillynet.com`;
```

The review env accepts the magic OTP `abc123` for self-registration (see `tests/b2b/self-service.spec.js` for the pattern). Note: OTP inputs use `aria-disabled` rather than the HTML `disabled` attribute — Playwright's auto-wait sees them as disabled, so use raw CSS selectors plus `pressSequentially` instead of `getByRole(...).fill()`:

```js
await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
// ...digits 2-6
```

## Writing a new test

1. Pick (or create) a folder under `tests/` matching the feature area.
2. **Record the happy path with codegen** — fastest way to discover real selectors:
   ```bash
   npx playwright codegen --viewport-size=1440,900 -o tests/MyArea/my-flow.spec.js https://learning.oreilly.review/
   ```
3. **Clean up the recording** — codegen captures every click, including retries, accidental clicks on prose, and noisy `ArrowLeft` press loops. Trim aggressively:
   - Replace ad-hoc emails with `Date.now()` patterns
   - Delete prose `getByText('Chapter 1. ...')` clicks — they're brittle
   - Collapse long `PageDown` sequences into `for` loops
   - Add waits where the app does async work (OTP send, SSO handoff)
4. **Run with `--debug`** to step through and verify each assertion.
5. **Run headless twice** to confirm stability before opening a PR.

## Usage-event coverage spec

[`tests/Usage/b2b-ucv-reader-usage.spec.js`](tests/Usage/b2b-ucv-reader-usage.spec.js) simulates a fresh B2B user signing up and reading multiple chapters of a UCV book. It's the canonical reference for verifying `/api/v2/usage-event/` behavior end-to-end.

**What it verifies:**
- Events fire roughly every 15 seconds while the user is on a chapter URL (`.../ch0X.html`)
- Events stop the moment the user navigates to a non-chapter URL (home, book detail)
- Events stop after ~2 minutes of inactivity even if the user stays on a chapter page
- Events resume immediately after the user interacts again (page-down, scroll, etc.)

**How verification works.** Active reading windows are asserted in-test by [`UsageEventTracker`](helpers/usageEventTracker.js): per-step counts must fall in an expected range and every captured response must be 2xx, with all per-step violations aggregated into one final failure. Silent windows (the 30s home wait in TEST 3, the 3-min idle in TEST 5) are verified manually in Coot Admin against the per-run test-user email — printed as `[test-user] qa+b2busage-<ms>@oreillynet.com` near the top of the log.

Full step-by-step breakdown: [`docs/usage-event-test-overview.md`](docs/usage-event-test-overview.md).

**Runtime:** ~10-12 minutes per run, mostly because of the 3-minute idle window in the final test. The per-test timeout is bumped to 20 minutes via `test.setTimeout()` in the spec.

## Snapshots / visual diffs

Snapshots live under `tests/__snapshots__/` and use Playwright's `toHaveScreenshot()` (see `tests/navigation.spec.js`). To regenerate after intentional UI changes:

```bash
npx playwright test --update-snapshots tests/navigation.spec.js
```

## Reports and traces

- After any run, HTML report at `playwright-report/index.html` — `npm run test:report` opens it.
- On failure, traces are saved under `test-results/<test-name>/trace.zip`. Open with:
  ```bash
  npx playwright show-trace test-results/path/to/trace.zip
  ```
  Traces include DOM snapshots at every step — invaluable for debugging.

## Recommended add-ons

### Editor

**VS Code: Playwright Test for VSCode** (`ms-playwright.playwright`)
Inline run buttons next to each test, locator picker, live trace viewer, and "record at cursor". This is the single biggest productivity boost for this repo.

### Optional npm packages

| Package | When to add |
|---|---|
| `@axe-core/playwright` | Automated accessibility scans. Pair with the `keyboard-a11y-audit` skill if you're doing a11y work. |
| `dotenv` | If you need per-developer `.env` files for `PLAYWRIGHT_ENV` / `BASE_URL` / secrets. |
| `allure-playwright` | Richer cross-run reporting if the built-in HTML report isn't enough. |
| `@faker-js/faker` | More variety for generated test data than the current `Date.now()`-suffix pattern. |

### MCP servers for AI-assisted development

If you're working on this repo with Claude Code or another MCP-capable assistant, these servers turn the assistant from "code generator" into a hands-on collaborator:

| MCP | Why it matters here |
|---|---|
| **`@playwright/mcp`** (Playwright MCP) | Gives the assistant direct control of a real Chromium and access to the page's accessibility tree. Use it for **selector discovery** on live pages without launching Inspector yourself — far faster than describing what you see in screenshots. The `mcp__playwright__browser_snapshot` + `mcp__playwright__browser_click` flow is how the UCV book detail spec's unknown selectors got found. |
| **`@modelcontextprotocol/server-github`** (GitHub MCP) | Read PRs, comments, and CI status; open PRs and issues; manage labels. Removes the round-trip of pasting `gh` output into chat. |
| **Filesystem MCP** (often built into the client) | Lets the assistant grep, read, and edit files directly. Usually on by default in Claude Code. |

Install MCPs at the client level (e.g., in Claude Code's `settings.json`), not in this repo. They're developer tooling, not a runtime dependency.

### Claude Code skills

If you're working with Claude Code, the **`playwright-cli`** skill speeds up Playwright work even more than the Playwright MCP alone: it wraps the CLI with snapshot-aware commands (`open`, `goto`, `click <ref>`, `type`, `screenshot`) so the assistant can drive a browser and discover selectors interactively without a full `codegen` session.

Install it via the plugin manager (one-time, at the client level):

```
/plugin install playwright@claude-plugins-official
```

After installing, the assistant can invoke the skill on demand — no per-repo setup needed.

### Browser DevTools tips

- Use Playwright's **locator picker** (the "Pick locator" button in `--debug` or the VS Code extension) before writing selectors by hand — it prefers role-based locators which survive UI churn.
- For React/MUI apps, `aria-disabled="true"` is often used instead of HTML `disabled`. Playwright respects ARIA, so use raw CSS selectors when you need to fill those fields.
- The cookie banner (`#onetrust-consent-sdk`) can intercept clicks — see `tests/quizzes/quiz.spec.js` for how it's removed via `page.evaluate(() => document.getElementById('onetrust-consent-sdk')?.remove())`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Test stalls on an OTP / verification input that's `aria-disabled` | Use raw CSS selector + `pressSequentially`, not `getByRole().fill()`. |
| Spec reaches the book page but gets redirected to login | Cross-subdomain SSO handoff didn't finish — `await page.waitForURL(...)` between registration and the learning subdomain. |
| `getByText('some prose')` click times out | Recording captured an accidental click; remove it. Prefer role/test-id locators. |
| Cookie banner clicks fail or duplicate | The banner sometimes re-renders. Either `evaluate`-remove it or scope clicks to the dialog. |
| Captcha / "Warning: Pressing this button" appears in a recording | These are usually password-visibility toggles, not captchas — delete those lines. |
| Spec passes once but fails second run | Test isn't idempotent. Clean up created data in `afterAll`, use unique IDs per run. |
