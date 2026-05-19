import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  const uniqueEmail = `qa+b2busage-${Date.now()}@oreillynet.com`;

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
  await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/');
  await page.getByRole('link', { name: 'API Concepts' }).click();
  await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch01.html#id4');
  for (let i = 0; i < 80; i++) {
    await page.locator('#book-content').press('PageDown');
    await page.waitForTimeout(750);
  }
  await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch02.html#chapter-api-design-patterns-language');
  for (let i = 0; i < 80; i++) {
    await page.locator('#book-content').press('PageDown');
    await page.waitForTimeout(750);
  }
  await page.goto('https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/ch03.html');
  for (let i = 0; i < 25; i++) {
    await page.locator('#book-content').press('PageDown');
    await page.waitForTimeout(1200);
  }
  await page.getByRole('link', { name: "O'Reilly Home" }).click();
});
