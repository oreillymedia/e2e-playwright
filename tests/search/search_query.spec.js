const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../../helpers/auth');

// NOTE: Only the "Books" filter is active — all other format filter clicks are commented out
// in the original Cypress test, preserved here as comments.

test.describe('Anonymous Book Search', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await page.goto('/search');
    await page.locator('#orm-global-site-search-form--desktop > .orm-global-site-search-label > .orm-global-site-search-input')
      .fill('Python');
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="formats-toggle"]').click();
    await page.locator('.MuiTypography-uiBody').filter({ hasText: /^Books/ }).click();
    // await page.locator('label', { hasText: 'Courses' }).first().click();
    // await page.locator('label', { hasText: 'Live Courses' }).first().click();
    // await page.locator('label', { hasText: 'On Demand' }).first().click();
    // await page.locator('label', { hasText: 'Videos' }).first().click();
    // await page.locator('label', { hasText: 'Case Studies' }).first().click();
    // await page.locator('label', { hasText: 'Conferences' }).first().click();
    // await page.locator('label', { hasText: 'Other' }).first().click();
    // await page.locator('label', { hasText: 'Live Events' }).first().click();
    // await page.locator('label', { hasText: 'Audiobooks' }).first().click();
    // await page.locator('label', { hasText: 'Shortcuts' }).first().click();
    // await page.locator('label', { hasText: 'Articles' }).first().click();
    // await page.locator('[for="formats-interactive-7"] > .MuiTypography-root').click();
    // await page.locator('label', { hasText: 'Sandboxes' }).first().click();
    // await page.locator('label', { hasText: 'Cloud Labs' }).first().click();
    // await page.locator('label', { hasText: 'Playlists' }).first().click();
    // await page.locator('label', { hasText: 'Expert' }).first().click();
    // await page.locator('label', { hasText: 'Public' }).first().click();
  });

  test('should display search results related to "Python"', async ({ page }) => {
    await expect(page.locator('main').getByText('Python', { exact: false }).first()).toBeVisible();
  });
});
