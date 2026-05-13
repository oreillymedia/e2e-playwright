const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

const BOOK_URL = '/library/view/learning-api-styles/9781098153984/';

test.describe('UCV Book Detail', () => {
  test.describe.configure({ mode: 'parallel' });
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await login(page, { type: 'b2b' });
    await page.goto(BOOK_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('should display book metadata', async () => {
    await expect(page.getByRole('heading', { name: 'Learning API Styles', level: 2 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lukasz Dynowski' }).first()).toBeVisible();
    await expect(page.locator('img[src*="9781098153984"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible();
  });

  test('should open and close the table of contents', async () => {
    const toggle = page.getByTestId('table-of-contents-button');
    const chapter = page.getByRole('link', { name: 'Foreword' });
    const closeBtn = page.getByRole('button', { name: 'Close table of contents' });

    // TOC opens by default at desktop width on this page; close it first to make
    // the open assertion meaningful.
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(chapter).toBeHidden();
    }

    await toggle.click();
    await expect(chapter).toBeVisible();

    await page.getByRole('button', { name: 'Close table of contents' }).click();
    await expect(chapter).toBeHidden();
    await expect(page.getByText('Table of contents collapsed')).toBeVisible();
  });
});
