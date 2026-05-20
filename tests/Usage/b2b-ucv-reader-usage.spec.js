import { test, expect } from '@playwright/test';

test('new B2B user registers and reads chapters 1-6 of a UCV book', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000); // up to 20 min — includes a 3-min idle wait in the last step
  const uniqueEmail = `qa+b2busage-${Date.now()}@oreillynet.com`;

  await test.step('register a new B2B user', async () => {
    await page.goto('https://www.oreilly.review/self-registration/playwright-b2b/');
    await page.getByRole('textbox', { name: 'First Name' }).fill('QA');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('B2B');
    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill('Testing_12345');
    await page.getByRole('button', { name: 'Set Up My Account' }).click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.waitForURL((url) => !url.toString().includes('self-registration'), { timeout: 30000 });
  });

  await test.step('Scroll down to the bottom of Chapter 1 over 60 seconds then clicks to next chapter', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch01.html#id4');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  await test.step('Scroll to the bottom of Chapter 2 over 60 seconds then clicks TOC link to the next chapter', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch02.html#chapter-api-design-patterns-language');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  await test.step('Scroll to the middle of chapter 3 over 30 seconds, then click back to the home page via the O\'Reilly logo', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch03.html');
    for (let i = 0; i < 25; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(1200);
    }
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
    // Silent window: 30s on the home page — DB should show zero usage events in this range,
    // verifying events stop when the user leaves the reading experience.
    await page.waitForTimeout(30000);
  });

  await test.step('dismiss the Appcues onboarding popup if shown', async () => {
    const appcuesPopup = page.locator('appcues-container iframe').contentFrame().locator('appcues');
    if (await appcuesPopup.isVisible().catch(() => false)) {
      await appcuesPopup.click();
    }
  });

  await test.step('Scroll through Chapter 4 over 60 seconds', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch04.html');
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  await test.step('Navigate to Chapter 5 (REST) via the TOC and scroll for 60 seconds', async () => {
    await page.getByTestId('toc-part-title-9781098153984-/ch05.html').getByRole('link', { name: 'REST' }).click();
    await page.locator('#book-content').click();
    for (let i = 0; i < 80; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
  });

  await test.step('Scroll to the middle of Chapter 6 and verify usage-event reactivation after a 3-minute idle by scrolling down t', async () => {
    await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch06.html');
    // Scroll down for 30 seconds so usage events fire before the idle period begins.
    for (let i = 0; i < 40; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Idle for 3 minutes so /api/v2/usage-event/ requests stop (2-min inactivity threshold).
    await page.waitForTimeout(180000);
    // Three page-downs to reactivate the session — usage events should begin firing again.
    for (let i = 0; i < 3; i++) {
      await page.locator('#book-content').press('PageDown');
      await page.waitForTimeout(750);
    }
    // Hold for 45 seconds so the resumed usage events have time to fire (~3 events).
    await page.waitForTimeout(45000);
    // Return to the home page via the O'Reilly logo.
    await page.getByRole('link', { name: "O'Reilly Home" }).click();
  });
});
