const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../helpers/auth');

// NOTE: Home page sections were updated on the site. Original Cypress tests checked for
// "On Our Radar", "Interactive Learning", "Live Events" which no longer exist.
// B2B sections: "Recently added", "Most popular".
// B2C sections (redesigned): "Active Learning", "Learn your way", "Level up with guided learning", "Ready to go deeper?".

test.describe('Home', () => {
  test.describe.configure({ mode: 'parallel' });
  test.describe('b2b user', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await login(page, { type: 'b2b' });
    });

    test.beforeEach(async () => {
      await page.setViewportSize(VIEWPORTS['macbook-15']);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    test.describe('basic functionality', () => {
      test('should display the content carousels', async () => {
        await expect(page.getByText('Recently added').first()).toBeVisible();
        await expect(page.getByText('Most popular').first()).toBeVisible();
      });
    });
  });

  test.describe('b2c user', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await login(page, { type: 'b2cSubscriber' });
    });

    test.beforeEach(async () => {
      await page.setViewportSize(VIEWPORTS['macbook-15']);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    test.describe('basic functionality', () => {
      test('should display the content carousels', async () => {
        await expect(page.getByRole('heading', { name: 'Active Learning' }).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Learn your way' }).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Level up with guided learning' }).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Ready to go deeper?' }).first()).toBeVisible();
      });
    });
  });
});
