import { test } from '@playwright/test';
import { fillMFACode } from '../../utils/mfa.js';
import { UsageEventTracker } from '../../helpers/usageEventTracker.js';

/**
 * End-to-end usage-event coverage spec.
 *
 * Simulates a new B2B user signing up and consuming book content on
 * learning.oreilly.review. Verifies that /api/v2/usage-event/ requests:
 *   - fire while the user is actively reading a chapter page,
 *   - stop when the user navigates away from the reading experience,
 *   - stop after ~2 minutes of inactivity on a chapter page, and
 *   - resume once the user interacts with the page again.
 *
 * Active reading windows are verified in-test by UsageEventTracker, which
 * captures /api/v2/usage-event/ requests and asserts per-step counts and
 * 2xx responses (see helpers/usageEventTracker.js). Silent windows — the
 * 30s home wait in step 3 and the 3-min idle in step 5 — are still
 * verified by pairing the step's wall-clock timestamps with the user's
 * email in the database to confirm zero events.
 *
 * Notes:
 *   - The review env accepts the magic OTP `abc123` for self-registration.
 *   - OTP digit inputs use aria-disabled (not HTML disabled), so they need
 *     a raw CSS selector + pressSequentially — getByRole + .fill() blocks
 *     on Playwright's auto-wait.
 *   - Usage events fire roughly every 15 seconds, and only on chapter
 *     URLs (`.../ch0X.html`). Registration, home, and book-detail pages
 *     are silent.
 */
test('new B2B user registers and reads chapters 1-6 of a UCV book', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000); // up to 20 min — includes a 3-min idle wait in the last step
  // Unique email per run so the OTP modal can proceed (the email must not
  // already exist in the auth system).
  const uniqueEmail = `qa+b2busage-${Date.now()}@oreillynet.com`;
  // Print the test user's email so the human verifying silent windows in
  // the database can pair this run's timestamps with the user.
  console.log(`[test-user] ${uniqueEmail}`);

  // Capture /api/v2/usage-event/ requests so the test can assert per-step
  // counts and response status. See helpers/usageEventTracker.js for the
  // windowing semantics; the per-step assertions below use the ranges from
  // docs/superpowers/specs/2026-05-27-ucv-reader-network-verification-design.md.
  const tracker = new UsageEventTracker(page, {
    urlPattern: /\/api\/v2\/usage-event\//,
  });

  // Auto-dismiss the OneTrust cookie banner whenever it appears and blocks
  // an action. The banner overlays the bottom of the page and intercepts clicks
  // like the chapter "Next" link. Using Playwright's addLocatorHandler is the
  // canonical fix: when an action is interrupted by #onetrust-banner-sdk,
  // Playwright calls the handler (which clicks the real Accept button, setting
  // the consent cookie) and then retries the original action.
  await page.addLocatorHandler(
    page.locator('#onetrust-banner-sdk'),
    async () => {
      await page.getByRole('button', { name: 'Accept Cookies' }).click();
    },
    { noWaitAfter: true }
  );

  try {
  // USER CREATION: create a new B2B user via self-registration signup.
  // No usage events are expected during this step — registration is not
  // a chapter URL.
  await test.step('register a new B2B user', async () => {
    await page.goto('https://www.oreilly.review/self-registration/playwright-b2b/');
    await page.getByRole('textbox', { name: 'First Name' }).fill('QA');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('B2B');
    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill('Testing_12345');
    await page.getByRole('button', { name: 'Set Up My Account' }).click();
    // OTP digit inputs use aria-disabled; raw selector + pressSequentially
    // is required. The review env accepts `abc123` as the magic verification code.
    await fillMFACode(page);
    // After OTP, the auth backend does an SSO handoff to set cookies on
    // learning.oreilly.review. We need to wait for that redirect before
    // navigating to a chapter page, otherwise the chapter URL would
    // bounce us back to login.
    await page.waitForURL((url) => !url.toString().includes('self-registration'), { timeout: 30000 });
  });

  // TEST 1: actively read Chapter 1 for ~60 seconds, then click "Next" to
  // navigate to Chapter 2. 80 PageDowns × 750ms = 60s of sustained activity
  // on a chapter URL, which should produce ~4 usage events (one every ~15s).
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

  // TEST 2: actively read Chapter 2 — scroll to the bottom over 30 seconds,
  // then scroll back to the top over 30 seconds, then navigate to Chapter 3
  // via a TOC click. Total ~60 seconds of activity → expected events: ~4.
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

  // TEST 3: read Chapter 3 briefly, then leave the reading experience.
  // The 30s wait on the home page is the "silent" verification window —
  // the DB should show ZERO usage events for this user between the
  // home-logo click and the next chapter navigation. This confirms
  // events stop when the user leaves a chapter URL.
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
    // Silent window: 30s on the home page. Pair this timestamp range with
    // the user's email in the DB; the count should be 0.
    await page.waitForTimeout(30000);
    // Dismiss the Appcues onboarding popup that new B2B users see once on
    // the first home-page visit. Conditional so returning users (or runs
    // where Appcues isn't loaded) don't fail.
    const appcuesPopup = page.locator('appcues-container iframe').contentFrame().locator('appcues');
    // eslint-disable-next-line playwright/no-conditional-in-test -- dismiss Appcues popup only when present
    if (await appcuesPopup.isVisible().catch(() => false)) {
      await appcuesPopup.click();
    }
  });

  // TEST 4: read Chapter 4 with a back-and-forth scroll pattern, then
  // return to the book detail page (a non-chapter URL — events should
  // stop after the click).
  //   - 30s scrolling to the middle    → ~2 events
  //   - 30s scrolling back to the top  → ~2 events
  //   - 60s scrolling to the bottom    → ~4 events
  //   - 30s paused at the bottom       → ~2 events (session still active
  //                                       even though no keystrokes)
  await test.step('Scroll to the middle of Chapter 4 over 30 seconds, back to the top over 30 seconds, then to the bottom and pause for 30 seconds, then click back to the book detail page', async () => {
    tracker.markWindowStart();
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch04.html');
    // Scroll to the middle over 30 seconds (40 page-downs at 750ms).
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Scroll back to the top over 30 seconds.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageUp');
      await page.waitForTimeout(750);
    }
    // Scroll all the way to the bottom (80 page-downs from the top), then
    // linger at the bottom for 30 seconds without keystrokes.
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
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

  // TEST 5: idle / reactivation test on Chapter 5.
  //   - 30s active scrolling          → ~2 events
  //   - 3-min idle wait               → events should STOP after the
  //                                      ~2-minute inactivity threshold
  //   - 3 page-downs to wake session  → reactivation signal
  //   - 45s post-reactivation hold    → ~3 events should resume
  //   - return to home logo           → end of test (events stop again)
  await test.step('Scroll to the middle of Chapter 5 and verify usage-event reactivation after a 3-minute idle by scrolling down then holding for 45 seconds', async () => {
    tracker.markWindowStart();
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch05.html');
    // Active scrolling for 30 seconds so events are flowing before the idle.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Idle 3 minutes — passes the 2-min inactivity threshold so events stop.
    await page.waitForTimeout(180000);
    // Re-mark the window to discard both the pre-idle scroll events and
    // any stray events fired during the idle. Only the post-reactivation
    // 45s window is asserted below (range 1–5).
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
  } finally {
    // Aggregate all per-step violations into a single failure with a full report.
    // Runs even if a test.step() throws, so violations collected before the
    // throw are still surfaced alongside the original failure.
    // Waits up to 5s for in-flight responses to land before evaluating.
    await tracker.assertNoViolations();
  }
});
