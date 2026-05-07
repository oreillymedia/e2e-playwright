const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../helpers/auth');
const { questions } = require('../fixtures/questions');

test.describe('Answers Results', () => {
  test.describe.configure({ mode: 'parallel' });
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, { type: 'b2b' });
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  for (const question of questions) {
    test.describe(`${question[0]}`, () => {
      test.beforeEach(async () => {
        await page.setViewportSize(VIEWPORTS['macbook-15']);
        await page.goto('answers/');
        await page.locator('#search-query').fill(question[0]);
        await page.keyboard.press('Enter');
      });

      test('should respond with the highlighted results', async () => {
        await expect(page.locator('.orm-api-answer').first()).toBeVisible();
      });
    });
  }
});
