const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../helpers/auth');
const siteUrls = require('../fixtures/siteUrls.json');

// NOTE: "On Our Radar" no longer exists on the home page — updated to "Recommended for you".
// NOTE: The Newsletters URL (www.oreilly.com) is a cross-domain URL; using waitForTimeout
// instead of waitForLoadState('networkidle') to avoid context-close errors.

const sizes = ['macbook-16', 'macbook-15', 'macbook-13', 'iphone-x', 'iphone-8'];

/** Use a simple timeout for external/cross-domain URLs that may not reach networkidle */
async function waitForPage(page, url) {
  const isExternal = url.startsWith('https://www.');
  if (isExternal) {
    await page.waitForTimeout(2000);
  } else {
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Navigation', () => {
  test.describe.configure({ mode: 'parallel' });
  test.describe('b2b default user', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await login(page, { type: 'b2b' });
    });

    test.beforeEach(async () => {
      await page.setViewportSize(VIEWPORTS['macbook-15']);
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    test.describe('tests sizes on home page', () => {
      for (const size of sizes) {
        test(size, async () => {
          await page.setViewportSize(VIEWPORTS[size]);
          await page.goto('/');
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveScreenshot(`home-${size}.png`);
        });
      }
    });

    test.describe('tests layout on all pages', () => {
      for (const pageData of siteUrls) {
        test(pageData.Element, async () => {
          await page.goto(pageData.URL);
          await waitForPage(page, pageData.URL);
          await expect(page).toHaveScreenshot(`layout-${pageData.Element}.png`);
        });
      }
    });

    test('Home Page', async () => {
      await page.goto('/');
      await expect(page.getByText('Recommended for you').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('home-page.png');
    });

    test('Answers', async () => {
      await page.goto('/answers/search/');
      await expect(page.getByText('Here are some examples of what you can ask')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('answers-page.png');
    });
  });

  test.describe.skip('b2c user', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      page = await context.newPage();
      await login(page, { type: 'b2cSubscriber' });
    });

    test.beforeEach(async () => {
      await page.setViewportSize(VIEWPORTS['macbook-15']);
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    test.describe('basic functionality', () => {
      test('should display the content carousels', async () => {
        await expect(page.getByText('Recommended for you').first()).toBeVisible();
        await expect(page.getByText('Recently added').first()).toBeVisible();
        await expect(page.getByText('Most popular').first()).toBeVisible();
      });
    });
  });
});
