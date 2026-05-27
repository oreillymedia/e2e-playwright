# UCV Reader Network Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-test verification of `/api/v2/usage-event/` requests to `tests/Usage/b2b-ucv-reader-usage.spec.js` so the Playwright run itself catches missing-event regressions, cadence regressions, and non-2xx responses — instead of leaving verification to a manual DB pairing after the run.

**Architecture:** A small `UsageEventTracker` helper in `helpers/usageEventTracker.js` attaches `page.on('request')` and `page.on('response')` listeners filtered to the usage-event URL, exposes `markWindowStart()` / `assertActiveWindow()` for per-step cursor-based windowing, and `assertNoViolations()` at the end of the test to surface all violations as one Playwright failure. The existing spec is modified to instantiate the tracker once and call it five times.

**Tech Stack:** Playwright 1.49, Node CommonJS helpers, ESM test specs, ESLint with `eslint-plugin-playwright`.

**Spec reference:** `docs/superpowers/specs/2026-05-27-ucv-reader-network-verification-design.md`

**Note on testing approach:** The spec explicitly skips unit tests for the helper — the helper is small with no branching beyond violation collection, and the integration test (`b2b-ucv-reader-usage.spec.js`) exercises every code path against the live review environment. The "verify" step at the end of this plan is the equivalent of "run the tests and watch them pass."

---

### Task 1: Build the `UsageEventTracker` helper

**Files:**
- Create: `helpers/usageEventTracker.js`

**Why one file for the whole class:** The class is ~80 lines with a single responsibility. The constructor, windowing methods, and finalize all share state (`entries`, `cursor`, `violations`). Splitting would force a public surface inside a single feature.

- [ ] **Step 1: Create the helper file with the full class**

Create `helpers/usageEventTracker.js` with this exact content:

```js
const { expect } = require('@playwright/test');

/**
 * Captures /api/v2/usage-event/ (or any matched URL) requests on a Playwright
 * Page and asserts per-step counts and 2xx responses. Designed for long-running
 * E2E specs where you want one aggregated failure at the end instead of
 * failing fast mid-run.
 *
 * Usage:
 *   const tracker = new UsageEventTracker(page, { urlPattern: /\/api\/v2\/usage-event\// });
 *   tracker.markWindowStart();
 *   // ... user actions on a chapter page ...
 *   tracker.assertActiveWindow({ label: 'Chapter 1', min: 2, max: 6 });
 *   // ... more steps ...
 *   await tracker.assertNoViolations();
 *
 * Windowing semantics:
 *   - `markWindowStart()` sets a cursor to the current end of the buffer.
 *     Any events captured before this call are excluded from the next assertion.
 *   - `assertActiveWindow()` reads [cursor, end-of-buffer], runs assertions,
 *     records any violations, and advances the cursor to the new end.
 *   - For windows preceded by a silent phase (home page, idle), call
 *     `markWindowStart()` immediately before entering the new active window
 *     so silent-phase events don't pollute the count.
 *
 * Response status is correlated by Playwright Request object identity, not URL,
 * so duplicate URLs are unambiguous.
 */
class UsageEventTracker {
  constructor(page, { urlPattern }) {
    this.urlPattern = urlPattern;
    this.entries = [];
    this.cursor = 0;
    this.violations = [];

    page.on('request', (request) => {
      if (this.urlPattern.test(request.url())) {
        this.entries.push({
          request,
          url: request.url(),
          status: null,
          timestamp: Date.now(),
        });
      }
    });

    page.on('response', (response) => {
      const req = response.request();
      const entry = this.entries.find((e) => e.request === req);
      if (entry) {
        entry.status = response.status();
      }
    });
  }

  /** Bound the next active window on its start side. Discards events captured so far. */
  markWindowStart() {
    this.cursor = this.entries.length;
  }

  /** Assert the count and 2xx status of events captured since the last window mark. */
  assertActiveWindow({ label, min, max }) {
    const windowEntries = this.entries.slice(this.cursor);
    this.cursor = this.entries.length;
    const count = windowEntries.length;
    const nonOk = windowEntries.filter(
      (e) => e.status !== null && (e.status < 200 || e.status >= 300),
    );

    let summary;
    if (count < min || count > max) {
      this.violations.push({
        label,
        message: `expected ${min}–${max} events, got ${count}`,
      });
      summary = `${count} events, expected ${min}–${max} ✗`;
    } else if (nonOk.length > 0) {
      for (const e of nonOk) {
        this.violations.push({
          label,
          message: `response ${e.status} for ${e.url} at ${new Date(e.timestamp).toISOString()}`,
        });
      }
      summary = `${count} events, ${nonOk.length} non-2xx ✗`;
    } else {
      summary = `${count} events, all 2xx ✓`;
    }
    // eslint-disable-next-line no-console -- progress log for long-running test
    console.log(`[usage-event] ${label}: ${summary}`);
  }

  /** Wait briefly for in-flight responses, then fail if any violations were collected. */
  async assertNoViolations() {
    const deadline = Date.now() + 5000;
    while (
      Date.now() < deadline &&
      this.entries.some((e) => e.status === null)
    ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const pending = this.entries.filter((e) => e.status === null);
    if (pending.length > 0) {
      this.violations.push({
        label: 'finalize',
        message: `pending response for ${pending.length} requests at finalize`,
      });
    }
    if (this.violations.length === 0) return;
    const report = this.violations
      .map((v) => `  • ${v.label}: ${v.message}`)
      .join('\n');
    expect(this.violations, `usage-event violations:\n${report}`).toEqual([]);
  }
}

module.exports = { UsageEventTracker };
```

- [ ] **Step 2: Smoke-test the file loads**

Run:
```bash
node -e "console.log(Object.keys(require('./helpers/usageEventTracker.js')))"
```
Expected output: `[ 'UsageEventTracker' ]`

If this fails with a syntax error, fix the helper before continuing — there's no point integrating a broken file into a 20-minute test.

- [ ] **Step 3: Lint the new file**

Run:
```bash
npx eslint helpers/usageEventTracker.js
```
Expected: no output (clean), exit code 0.

If ESLint complains about something other than the explicitly disabled `no-console` rule, fix it before committing.

- [ ] **Step 4: Commit**

```bash
git add helpers/usageEventTracker.js
git commit -m "$(cat <<'EOF'
feat: UsageEventTracker helper for in-test usage-event assertions

Adds a small helper that captures /api/v2/usage-event/ requests on a
Playwright Page, supports cursor-based windowing for per-step count
assertions, and aggregates all violations into one final failure so a
20-minute reader test surfaces every issue in a single run.

EOF
)"
```

---

### Task 2: Integrate the tracker into `b2b-ucv-reader-usage.spec.js`

**Files:**
- Modify: `tests/Usage/b2b-ucv-reader-usage.spec.js`

The spec already uses ESM `import`. The tracker uses `module.exports`, which Node ESM can interop. The import path from this spec file is `../../helpers/usageEventTracker.js`.

- [ ] **Step 1: Add the tracker import**

In `tests/Usage/b2b-ucv-reader-usage.spec.js`, add the import after the existing `fillMFACode` import.

Find:
```js
import { test } from '@playwright/test';
import { fillMFACode } from '../../utils/mfa.js';
```

Replace with:
```js
import { test } from '@playwright/test';
import { fillMFACode } from '../../utils/mfa.js';
import { UsageEventTracker } from '../../helpers/usageEventTracker.js';
```

- [ ] **Step 2: Instantiate the tracker at the top of the test**

Find the existing `addLocatorHandler` block (the OneTrust cookie banner handler). Insert the tracker instantiation immediately **before** it, so listeners are attached before any navigation happens.

Find:
```js
  // Auto-dismiss the OneTrust cookie banner whenever it appears and blocks
```

Insert immediately above:
```js
  // Capture /api/v2/usage-event/ requests so the test can assert per-step
  // counts and response status. See helpers/usageEventTracker.js for the
  // windowing semantics; the per-step assertions below use the ranges from
  // docs/superpowers/specs/2026-05-27-ucv-reader-network-verification-design.md.
  const tracker = new UsageEventTracker(page, {
    urlPattern: /\/api\/v2\/usage-event\//,
  });

```

- [ ] **Step 3: Add tracker calls to Step 1 (Chapter 1)**

Find the body of the Chapter 1 step:
```js
  await test.step('Scroll down to the bottom of Chapter 1 over 60 seconds then clicks to next chapter', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch01.html#id4');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Click the "Next" link at the bottom of the chapter to advance to Chapter 2.
    // The accessible name includes the chapter number prefix (e.g. "2. API Design Patterns").
    await page.getByTestId('statusBarNext').getByRole('link', { name: '2. API Design Patterns' }).click();
  });
```

Replace with:
```js
  await test.step('Scroll down to the bottom of Chapter 1 over 60 seconds then clicks to next chapter', async () => {
    tracker.markWindowStart();
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch01.html#id4');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    tracker.assertActiveWindow({
      label: 'Step 1 — Chapter 1, 60s active scroll',
      min: 2,
      max: 6,
    });
    // Click the "Next" link at the bottom of the chapter to advance to Chapter 2.
    // The accessible name includes the chapter number prefix (e.g. "2. API Design Patterns").
    await page.getByTestId('statusBarNext').getByRole('link', { name: '2. API Design Patterns' }).click();
  });
```

- [ ] **Step 4: Add tracker calls to Step 2 (Chapter 2)**

Find the Chapter 2 step body:
```js
  await test.step('Scroll to the bottom of Chapter 2 over 30 seconds then scroll back to the top over 30 seconds then clicks TOC link to the next chapter', async () => {
    // Scroll to the bottom over 30 seconds (40 page-downs at 750ms).
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Scroll back to the top over 30 seconds.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageUp');
      await page.waitForTimeout(750);
    }
    // Click the Chapter 3 link in the Table of Contents to navigate there.
    // The link text includes the chapter number prefix (e.g. "3. Network").
    await page.getByTestId('toc-part-title-9781098153984-/ch03.html').getByRole('link', { name: '3. Network' }).click();
  });
```

Replace with:
```js
  await test.step('Scroll to the bottom of Chapter 2 over 30 seconds then scroll back to the top over 30 seconds then clicks TOC link to the next chapter', async () => {
    tracker.markWindowStart();
    // Scroll to the bottom over 30 seconds (40 page-downs at 750ms).
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Scroll back to the top over 30 seconds.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageUp');
      await page.waitForTimeout(750);
    }
    tracker.assertActiveWindow({
      label: 'Step 2 — Chapter 2, 30s down + 30s up',
      min: 2,
      max: 6,
    });
    // Click the Chapter 3 link in the Table of Contents to navigate there.
    // The link text includes the chapter number prefix (e.g. "3. Network").
    await page.getByTestId('toc-part-title-9781098153984-/ch03.html').getByRole('link', { name: '3. Network' }).click();
  });
```

- [ ] **Step 5: Add tracker calls to Step 3 (Chapter 3)**

The active phase ends at the home-logo click, before the 30s silent home wait. Place `assertActiveWindow` immediately after the scroll loop, before the home click.

Find the Chapter 3 step body:
```js
  await test.step('Scroll to the middle of chapter 3 over 30 seconds, then click back to the home page via the O\'Reilly logo', async () => {
    for (let i = 0; i < 25; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(1200);
    }
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
```

Replace the opening of the step with:
```js
  await test.step('Scroll to the middle of chapter 3 over 30 seconds, then click back to the home page via the O\'Reilly logo', async () => {
    tracker.markWindowStart();
    for (let i = 0; i < 25; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(1200);
    }
    tracker.assertActiveWindow({
      label: 'Step 3 — Chapter 3, 30s active scroll',
      min: 1,
      max: 4,
    });
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
```

(The rest of the step — the 30s home wait, the Appcues popup dismissal — is unchanged. No assertion runs during the home wait.)

- [ ] **Step 6: Add tracker calls to Step 4 (Chapter 4)**

Step 4 is preceded by a silent home-page window, so `markWindowStart()` goes immediately before the `page.goto` for ch04 to discard any stray events from the home wait. `assertActiveWindow` goes after the final 30s pause at the bottom, before the book-detail navigation.

Find the Chapter 4 step body:
```js
  await test.step('Scroll to the middle of Chapter 4 over 30 seconds, back to the top over 30 seconds, then to the bottom and pause for 30 seconds, then click back to the book detail page', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch04.html');
```

Replace the opening with:
```js
  await test.step('Scroll to the middle of Chapter 4 over 30 seconds, back to the top over 30 seconds, then to the bottom and pause for 30 seconds, then click back to the book detail page', async () => {
    tracker.markWindowStart();
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch04.html');
```

Then find the end of the Chapter 4 step body:
```js
    await page.waitForTimeout(30000);
    // Click the book title in the reader header to return to the book
    // detail page. `.first()` because the title can appear in multiple
    // places (header + sidebar); the header link is rendered first.
    await page.getByRole('link', { name: 'Learning API Styles' }).first().click();
  });
```

Replace with:
```js
    await page.waitForTimeout(30000);
    tracker.assertActiveWindow({
      label: 'Step 4 — Chapter 4, 30s + 30s + 60s + 30s pause',
      min: 6,
      max: 14,
    });
    // Click the book title in the reader header to return to the book
    // detail page. `.first()` because the title can appear in multiple
    // places (header + sidebar); the header link is rendered first.
    await page.getByRole('link', { name: 'Learning API Styles' }).first().click();
  });
```

- [ ] **Step 7: Add tracker calls to Step 5 (Chapter 5)**

Step 5 has the 3-min idle in the middle, which is silent. Per the spec, treat the 30s pre-idle + 45s post-reactivation as a single active window, but call `markWindowStart()` a second time right after the idle to discard any stray events that fired during the idle.

Find the Chapter 5 step body:
```js
  await test.step('Scroll to the middle of Chapter 5 and verify usage-event reactivation after a 3-minute idle by scrolling down t', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch05.html');
    // Active scrolling for 30 seconds so events are flowing before the idle.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Idle 3 minutes — passes the 2-min inactivity threshold so events stop.
    await page.waitForTimeout(180000);
    // Three page-downs to wake the session — events should fire again.
    for (let i = 0; i < 3; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Hold 45 seconds so ~3 resumed events have time to fire and be captured.
    await page.waitForTimeout(45000);
    // Leave the reading experience entirely — events should stop again.
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
  });
```

Replace with:
```js
  await test.step('Scroll to the middle of Chapter 5 and verify usage-event reactivation after a 3-minute idle by scrolling down t', async () => {
    tracker.markWindowStart();
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch05.html');
    // Active scrolling for 30 seconds so events are flowing before the idle.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Idle 3 minutes — passes the 2-min inactivity threshold so events stop.
    await page.waitForTimeout(180000);
    // Re-mark the window so any stray events fired during the idle are
    // discarded from the post-reactivation count.
    tracker.markWindowStart();
    // Three page-downs to wake the session — events should fire again.
    for (let i = 0; i < 3; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Hold 45 seconds so ~3 resumed events have time to fire and be captured.
    await page.waitForTimeout(45000);
    tracker.assertActiveWindow({
      label: 'Step 5 — Chapter 5, post-reactivation 45s',
      min: 1,
      max: 5,
    });
    // Leave the reading experience entirely — events should stop again.
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
  });
```

(Note: the count range for step 5 is 1–5, scoped to just the post-reactivation 45s window — narrower than the spec table's "3–8" which was for the combined pre-idle + post-reactivation. Scoping to just post-reactivation gives a tighter check on the reactivation behavior, which is the actual property being verified.)

- [ ] **Step 8: Add the finalize call**

The finalize call is `await tracker.assertNoViolations()` placed immediately after the closing `await page.getByRole('link', { name: "O'Reilly Home" }).click();` of Step 5, but **outside** the `test.step()` callback — at the top level of the test function so a failure here is attributed to the test, not a step.

Find the closing of the test:
```js
    // Leave the reading experience entirely — events should stop again.
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
  });
});
```

Replace with:
```js
    // Leave the reading experience entirely — events should stop again.
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
  });

  // Aggregate all per-step violations into a single failure with a full report.
  // Waits up to 5s for in-flight responses to land before evaluating.
  await tracker.assertNoViolations();
});
```

- [ ] **Step 9: Lint the modified spec**

Run:
```bash
npx eslint tests/Usage/b2b-ucv-reader-usage.spec.js
```
Expected: no output, exit code 0.

- [ ] **Step 10: Commit**

```bash
git add tests/Usage/b2b-ucv-reader-usage.spec.js
git commit -m "$(cat <<'EOF'
test: assert per-step /api/v2/usage-event/ counts in UCV reader spec

Wire UsageEventTracker into the b2b-ucv-reader-usage spec so each
active chapter window has a count-range assertion plus 2xx status check,
and a final assertNoViolations aggregates everything into one failure.
The silent windows (home-page wait, 3-min idle) remain DB-verified per
the design spec.

EOF
)"
```

---

### Task 3: Verify against the review environment

This task is the real test of the helper — there are no unit tests, so this is where every code path gets exercised.

- [ ] **Step 1: Run the spec**

Run:
```bash
npx playwright test tests/Usage/b2b-ucv-reader-usage.spec.js --reporter=list 2>&1 | tee /tmp/ucv-run.log
```

Expected duration: ~20 minutes (the test has a 3-min idle and many scroll loops).

While it runs, you should see the `[usage-event] Step N — …: K events, all 2xx ✓` log lines appear roughly every minute or two as each step finishes.

- [ ] **Step 2: Check the console output captured five step summaries**

After the run completes:
```bash
grep '\[usage-event\]' /tmp/ucv-run.log
```

Expected: 5 lines, one per step, like:
```
[usage-event] Step 1 — Chapter 1, 60s active scroll: 4 events, all 2xx ✓
[usage-event] Step 2 — Chapter 2, 30s down + 30s up: 4 events, all 2xx ✓
[usage-event] Step 3 — Chapter 3, 30s active scroll: 2 events, all 2xx ✓
[usage-event] Step 4 — Chapter 4, 30s + 30s + 60s + 30s pause: 10 events, all 2xx ✓
[usage-event] Step 5 — Chapter 5, post-reactivation 45s: 3 events, all 2xx ✓
```

The exact counts will vary — what matters is that all five lines are present (proves the test reached each step) and each shows `all 2xx ✓` (proves the response listener correlated correctly).

- [ ] **Step 3: Confirm the spec passed**

Run:
```bash
tail -20 /tmp/ucv-run.log
```

Expected: a Playwright summary line like `1 passed (Xm Ys)`. No `failed` or `error` lines.

- [ ] **Step 4: If the spec failed, interpret the violation report**

If `assertNoViolations` threw, the failure message will contain a `usage-event violations:` block listing every violation with its step label. Read the violations:

- **`expected N–M events, got K`** with K < N: the cadence regressed (or events stopped entirely). Inspect the chapter URL behavior manually before adjusting the range.
- **`expected N–M events, got K`** with K > M: events fired more often than expected. Could mean the cursor leaked silent-window events into the active window — re-check the `markWindowStart()` placement.
- **`response NNN for https://…`** with NNN ≠ 2xx: a real backend issue. Don't loosen the assertion; report the issue.
- **`pending response for K requests at finalize`**: responses didn't land within 5s of finalize. If consistently small (1–2), increase the wait window in `assertNoViolations`. If large, investigate why responses are hanging.

Do not adjust assertion ranges to make a failing test pass without first verifying via DB that the behavior is actually correct. The whole point of this work is to catch regressions; loosening the test defeats it.

---

## Self-review summary

**Spec coverage:**
- Capture via request + response listeners — Task 1 Step 1 ✓
- `markWindowStart` / `assertActiveWindow` API — Task 1 Step 1 ✓
- Cursor-based windowing — Task 1 Step 1 ✓
- Request/response correlation by Request object identity — Task 1 Step 1 ✓
- `assertNoViolations` with 5s wait — Task 1 Step 1 ✓
- Soft-failure aggregation into single Playwright failure — Task 1 Step 1 ✓
- Console summary per step — Task 1 Step 1 ✓
- All five per-step assertions with the design's ranges — Task 2 Steps 3–7 ✓
- `markWindowStart` placed immediately before chapter navigation — Task 2 Steps 3–7 ✓
- Step 5's two-mark pattern (re-mark after the 3-min idle) — Task 2 Step 7 ✓
- "No unit tests for the helper" — explicitly called out in the Goal/Note ✓

**Deviation from the spec to flag:**
Step 5's count range in the spec table is 3–8 for "30s active + 45s post-reactivation" treated as one window. The plan narrows this to 1–5 by re-marking the window after the idle, so only the post-reactivation 45s contributes. This gives a tighter check on the reactivation property (the actual goal of step 5). Called out in a parenthetical in Task 2 Step 7 — flag to the user if they want the broader range instead.
