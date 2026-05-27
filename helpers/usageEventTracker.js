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
    if (!(urlPattern instanceof RegExp)) {
      throw new Error('UsageEventTracker: urlPattern (RegExp) is required');
    }
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

  /** Advance the cursor so events captured before this call are excluded from the next assertActiveWindow. */
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

    const countOk = count >= min && count <= max;
    if (!countOk) {
      this.violations.push({
        label,
        message: `expected ${min}–${max} events, got ${count}`,
      });
    }
    if (nonOk.length > 0) {
      for (const e of nonOk) {
        this.violations.push({
          label,
          message: `response ${e.status} for ${e.url} at ${new Date(e.timestamp).toISOString()}`,
        });
      }
    }
    let summary;
    if (countOk && nonOk.length === 0) {
      summary = `${count} events, all 2xx ✓`;
    } else {
      const parts = [];
      if (!countOk) parts.push(`expected ${min}–${max}, got ${count}`);
      if (nonOk.length > 0) parts.push(`${nonOk.length} non-2xx`);
      summary = `${count} events, ${parts.join('; ')} ✗`;
    }
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
