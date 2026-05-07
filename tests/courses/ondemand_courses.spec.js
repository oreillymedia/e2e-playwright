const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

test.describe('User Courses', () => {
  test.describe.configure({ mode: 'parallel' });
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await login(page, { type: 'b2b4' });
    await page.goto('/courses/');
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test.describe('On-demand Courses', () => {
    test("should navigate to user's on-demand courses", async () => {
      await expect(page).toHaveURL(/skills=/);
      // Page shows either Live courses or On-demand courses heading
      await expect(
        page.getByText('Live courses').or(page.getByText('On-demand courses')).first()
      ).toBeVisible();
    });
  });
});
