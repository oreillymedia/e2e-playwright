# UCV Reader Usage-Event Network Verification — Design

**Date:** 2026-05-27
**Spec for:** `tests/Usage/b2b-ucv-reader-usage.spec.js`

## Problem

The existing UCV reader test simulates a B2B user reading chapters 1–5 of a book, with each step described in comments as producing a specific number of `/api/v2/usage-event/` requests. Verification of those requests is currently a manual, after-the-fact step: a human pairs each `test.step()`'s wall-clock window with the user's email in the database and counts events.

The test passes today even when no usage events fire, when every request returns 500, or when the cadence drifts significantly. We need in-test verification so a Playwright run signals usage-event regressions directly.

## Scope

In scope:

- Verify each active reading step fires at least one `/api/v2/usage-event/` request.
- Verify each active reading step fires a count within an expected range (cadence regression detection).
- Verify every captured request returns a 2xx response.

Out of scope:

- Verifying silent windows (the 30s home-page wait in step 3, the 3-min idle in step 5) produce zero events. The DB-paired check remains the source of truth for the silent-window property. The tracker captures events during silent windows but does not assert on them.
- Verifying request payload contents (user id, event type, etc.). Payload correctness stays a DB-side concern.
- Adding Playwright fixtures, retries, or test-suite restructuring.

## Architecture

A single tracker object, instantiated once at the top of the test, owns three concerns:

1. **Capture.** Attaches `page.on('request')` and `page.on('response')` listeners filtered to URLs matching `/api/v2/usage-event/`. Each captured entry stores `{ request, url, status, timestamp }`, where `request` is the Playwright `Request` object. The request is recorded immediately; when a response arrives, the response listener finds the matching entry by `response.request() === entry.request` and writes the status. This correlates request to response by object identity, not URL, so duplicate URLs are unambiguous.
2. **Windowing.** Exposes `markWindowStart()` and `assertActiveWindow({ label, min, max })`. Together they bound a window over the captured events on both sides, so silent-window events don't pollute the next active window's count.
3. **Finalize.** Exposes `assertNoViolations()`, called once at the end of the test. Reports every violation collected across all steps as a single Playwright `expect` failure.

The tracker lives in `helpers/usageEventTracker.js`, next to `helpers/auth.js`. It is reusable for the future ucv-book-detail test.

## Tracker API

```js
import { UsageEventTracker } from '../../helpers/usageEventTracker.js';

const tracker = new UsageEventTracker(page, {
  urlPattern: /\/api\/v2\/usage-event\//,
});

// At the start of each active reading phase (after any preceding silent window):
tracker.markWindowStart();

// ... user actions (page-downs, navigation) ...

// At the end of each active reading phase, before the next navigation:
tracker.assertActiveWindow({
  label: 'Step 1 — Chapter 1, 60s active scroll',
  min: 2,
  max: 6,
});

// Once, after the last test.step() returns:
tracker.assertNoViolations();
```

### Windowing semantics

- An internal cursor points at the index in the captured-events buffer that marks the start of the current window.
- `markWindowStart()` sets the cursor to the current end of the buffer. Any events captured before this call (e.g. during a silent window) are excluded from the next assertion.
- `assertActiveWindow()` reads `[cursor, end-of-buffer]`, runs assertions, records any violations, and advances the cursor to the new end of the buffer.
- For steps without a preceding silent window, `markWindowStart()` is optional — the previous `assertActiveWindow()` already advanced the cursor.

### Assertions inside `assertActiveWindow`

1. Count of captured events in the window is within `[min, max]` inclusive.
2. Every captured response in the window has status 2xx.

Each failed condition appends a violation entry to an internal array. The method does not throw.

### Response-status timing

Requests are recorded at request time so counts are accurate even if the response is slow. The matching response updates the same entry with its status. `assertNoViolations()` waits up to 5 seconds for any in-flight responses to land before evaluating; any entry still without a response after that wait is reported as a `pending response` violation.

## Failure aggregation

```js
assertNoViolations() {
  if (this.violations.length === 0) return;
  const report = this.violations
    .map(v => `  • ${v.label}: ${v.message}`)
    .join('\n');
  expect(this.violations, `usage-event violations:\n${report}`).toEqual([]);
}
```

Violation entry shapes:

```js
{ label: 'Step 2 — Chapter 2…', message: 'expected 2–6 events, got 0' }
{ label: 'Step 4 — Chapter 4…', message: 'response 503 for https://…/usage-event/ at 12:04:22' }
{ label: 'Step 1 — Chapter 1…', message: 'pending response for 2 requests at finalize' }
```

All violations from all five steps surface in a single Playwright failure, so one 20-minute run produces a full picture rather than aborting at the first issue.

Each call to `assertActiveWindow()` also logs a one-line summary to the console during the run:

```
[usage-event] Step 1 — Chapter 1, 60s active scroll: 4 events, all 2xx ✓
[usage-event] Step 4 — Chapter 4…: 0 events, expected 6–14 ✗
```

Watchers tailing the run see progress without waiting for the final report.

## Per-step assertion plan

| Step | Label | Active duration | Expected | Range |
|------|-------|-----------------|----------|-------|
| 1 | Chapter 1 — 60s page-downs | ~60s | ~4 | 2–6 |
| 2 | Chapter 2 — 30s down + 30s up | ~60s | ~4 | 2–6 |
| 3 | Chapter 3 — 25 page-downs @ 1.2s | ~30s active (then 30s silent on home — not asserted) | ~2 | 1–4 |
| 4 | Chapter 4 — 30s + 30s + 60s + 30s pause | ~150s | ~10 | 6–14 |
| 5 | Chapter 5 — 45s post-reactivation only (30s pre-idle and 3-min idle in middle — not asserted) | ~45s | ~3 | 1–5 |

`markWindowStart()` is called immediately before the navigation that enters the chapter URL for that step's active phase (`page.goto(...)` for steps 1, 4, 5; the "Next" / TOC click for steps 2, 3). This ensures any events fired during chapter render belong to the new window, and any events fired during a preceding silent window do not. For step 1, calling it is optional since registration produces no events, but the spec includes it for symmetry.

`assertActiveWindow()` is called at the end of each step's active phase, before any navigation that leaves the chapter URL (home logo, book-detail link) or before any extended idle wait.

Step 5 has two `markWindowStart()` / `assertActiveWindow()` boundaries collapsed into one assertion — the 30s pre-idle scroll and the 45s post-reactivation scroll are both treated as a single active window with the 3-min idle in the middle filtered out. Concretely: call `markWindowStart()` before navigating to ch05, `markWindowStart()` again after the 3-min idle (immediately before the three wake page-downs) to discard any stray events captured during the idle, and `assertActiveWindow()` after the 45s hold. The combined range (3–8) accounts for both active sub-phases together.

## Why not unit-test the helper

`UsageEventTracker` is small and has no branching beyond violation collection. The only meaningful test is the integration run itself. The first `npm test` against the review env exercises every code path: a successful run with all 2xx responses, and (under a forced regression) the count-out-of-range and non-2xx paths.

If the helper later grows (multiple URL patterns, request-body matching, multi-page tracking), revisit and add unit tests.

## Files touched

- **New:** `helpers/usageEventTracker.js` — the `UsageEventTracker` class.
- **Modified:** `tests/Usage/b2b-ucv-reader-usage.spec.js` — import the tracker, instantiate at top of test, call `markWindowStart()` / `assertActiveWindow()` per step, call `assertNoViolations()` at end.

No other files change. No new dependencies.
