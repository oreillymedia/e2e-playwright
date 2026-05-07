const { USER_LOGINS } = require('../fixtures/login');
const { createNewUserInfo } = require('../utils/user');

const ENV = process.env.PLAYWRIGHT_ENV || 'review';

/**
 * Logs in as a user type from fixtures or with explicit credentials.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ type?: string, email?: string, password?: string }} options
 * @example await login(page, { type: 'b2b' });
 */
async function login(page, { type, email, password }) {
  if (type) {
    email = USER_LOGINS[ENV]?.[type][0];
    password = USER_LOGINS[ENV]?.[type][1];
  }
  await page.context().clearCookies();
  await page.goto('');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('button[data-testid="EmailSubmit"]').click();
  await page.locator('input[name="password"]').fill(password);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => !url.toString().includes('www.'));
}

/**
 * Goes through the signup process as a specified user type.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ type: string }} options
 * @example await signup(page, { type: 'b2cTrial' });
 */
async function signup(page, { type }) {
  const newUser = createNewUserInfo({ type });
  await page.getByText('Start a free trial').click();
  await page.locator('input[name="firstName"]').fill(newUser.firstName);
  await page.locator('input[name="lastName"]').fill(newUser.lastName);
  await page.locator('input[name="email"]').fill(newUser.email);
  await page.locator('input[name="password"]').fill(newUser.password);
  await page.locator('button[data-testid="submitButton"]').click();
}

/** Maps Cypress viewport size names to Playwright dimensions */
const VIEWPORTS = {
  'macbook-16': { width: 1536, height: 960 },
  'macbook-15': { width: 1440, height: 900 },
  'macbook-13': { width: 1280, height: 800 },
  'iphone-x': { width: 375, height: 812 },
  'iphone-8': { width: 375, height: 667 },
};

module.exports = { login, signup, VIEWPORTS, ENV };
