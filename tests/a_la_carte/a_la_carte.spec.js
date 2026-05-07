const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

test.describe('Your Purchases', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  test.describe('Purchased Content for b2c user', () => {
    test("Should show 'Your Purchases' button for B2C user", async ({ page }) => {
      await login(page, { type: 'b2clacarte' });
      await page.goto('/purchased-content/');
      await expect(page).toHaveURL(/purchased-content/);
      await expect(page.locator('a[href*="/purchased-content"]').first()).toBeAttached();
    });

    test.describe('Purchased Content for b2b', () => {
      test("Should NOT show 'Your Purchases' button for B2B user", async ({ page }) => {
        await login(page, { type: 'b2b' });
        await page.goto('/purchased-content/');
        await expect(page).toHaveURL(/purchased-content/);
        await expect(page.locator('a[href*="/purchased-content"]').first()).not.toBeAttached();
      });
    });

    test.describe('Purchased Content for b2b Academic', () => {
      test("Should not show 'Your Purchases' button for B2B Academic user", async ({ page }) => {
        await login(page, { type: 'b2bAcademic' });
        await page.goto('/purchased-content/');
        await expect(page.locator('a[href*="/purchased-content"]').first()).not.toBeAttached();
      });
    });

    test.describe('Purchased Content for b2bExpiredTrial', () => {
      test("Should NOT show 'Your Purchases' button for b2bExpiredTrial user", async ({ page }) => {
        await login(page, { type: 'b2b' });
        await page.goto('/purchased-content/');
        await expect(page).toHaveURL(/purchased-content/);
        await expect(page.locator('a[href*="/purchased-content"]').first()).not.toBeAttached();
      });
    });

    test.describe('Purchased b2cTrial', () => {
      test("Should NOT show 'Your Purchases' button for B2CTrial user", async ({ page }) => {
        await login(page, { type: 'b2b' });
        await page.goto('/purchased-content/');
        await expect(page).toHaveURL(/purchased-content/);
        await expect(page.locator('a[href*="/purchased-content"]').first()).not.toBeAttached();
      });
    });
  });
});
