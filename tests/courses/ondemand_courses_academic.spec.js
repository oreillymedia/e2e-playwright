const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

test.describe('User Courses', () => {
  test.describe.configure({ mode: 'parallel' });
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await login(page, { type: 'b2bAcademic' });
    await page.goto('/courses/');
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test.describe('On-demand Courses', () => {
    test('should navigate to popular courses', async () => {
      await expect(page.getByText('Popular courses').first()).toBeVisible();
    });
  });
});
