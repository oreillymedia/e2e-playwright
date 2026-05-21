import { test, expect } from '@playwright/test';

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
 * Each test.step() corresponds to one verifiable window in the database:
 * pair the step's wall-clock timestamps with the user's email to count
 * the events generated for that phase.
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
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    // After OTP, the auth backend does an SSO handoff to set cookies on
    // learning.oreilly.review. We need to wait for that redirect before
    // navigating to a chapter page, otherwise the chapter URL would
    // bounce us back to login.
    await page.waitForURL((url) => !url.toString().includes('self-registration'), { timeout: 30000 });
  });

  // TEST 1: actively read Chapter 1 for ~60 seconds.
  // 80 PageDowns × 750ms = 60s of sustained activity on a chapter URL,
  // which should produce ~4 usage events (one every ~15s).
  await test.step('Scroll down to the bottom of Chapter 1 over 60 seconds then clicks to next chapter', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch01.html#id4');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  // TEST 2: actively read Chapter 2 for ~60 seconds (same pacing as ch1).
  // Expected events: ~4.
  await test.step('Scroll to the bottom of Chapter 2 over 60 seconds then clicks TOC link to the next chapter', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch02.html#chapter-api-design-patterns-language');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  // TEST 3: read Chapter 3 briefly, then leave the reading experience.
  // The 30s wait on the home page is the "silent" verification window —
  // the DB should show ZERO usage events for this user between the
  // home-logo click and the next chapter navigation. This confirms
  // events stop when the user leaves a chapter URL.
  await test.step('Scroll to the middle of chapter 3 over 30 seconds, then click back to the home page via the O\'Reilly logo', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch03.html');
    for (let i = 0; i < 25; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(1200);
    }
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
    // Silent window: 30s on the home page. Pair this timestamp range with
    // the user's email in the DB; the count should be 0.
    await page.waitForTimeout(30000);
    // Dismiss the Appcues onboarding popup that new B2B users see once on
    // the first home-page visit. Conditional so returning users (or runs
    // where Appcues isn't loaded) don't fail.
    const appcuesPopup = page.locator('appcues-container iframe').contentFrame().locator('appcues');
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
});
