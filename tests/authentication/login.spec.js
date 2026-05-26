const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../../helpers/auth');
const { USER_LOGINS } = require('../../fixtures/login');

// NOTE: cy.origin() for cross-origin flows (Okta SSO, Patron Validation, Shibboleth)
// is not needed in Playwright — cross-origin navigation is handled natively.

test.describe('Authentication', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  // Dynamically generate one test per user type in USER_LOGINS.review
  for (const [type, [username, password]] of Object.entries(USER_LOGINS.review)) {
    test(`should login correctly with user type ${type}`, async ({ page }) => {
      await page.goto('https://learning.oreilly.review/home/');
      await page.locator('input[id="email"]').fill(username);
      await page.locator('button[data-testid="EmailSubmit"]').click({ force: true });
      await page.getByText('Continue').first().click({ force: true });
      await page.locator('input[name="password"]').fill(password);
      await page.locator('[data-testid="SignInBtn"]').click({ force: true });
      await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
      await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
    });
  }

  test.fixme('should login as a M2M SSO user', async ({ page }) => {
    // TODO: SSO account airforce_one@mail.mil.invalid returns error=access_revoked on review env.
    // Re-provision the Okta account or update credentials when access is restored.
    await page.goto('https://learning.oreilly.review/home/');
    await page.locator('input[name="email"]').fill('airforce_one@mail.mil.invalid');
    await page.getByText('Continue').first().click();
    await page.locator('#ssoproviders').click();
    await page.locator('[data-value="School of SSO"]').click();
    await page.getByText('Sign in with SSO').click();
    // Playwright handles cross-origin (Okta) natively — no cy.origin() needed
    await page.locator('input[name="username"]').fill('airforce_one@mail.mil.invalid');
    await page.locator('input[name="password"]').fill('y5Y7Ac9MTZf');
    await page.locator('#okta-signin-submit').click();
    // SSO redirects don't reach networkidle — wait for return to oreilly domain instead
    await page.waitForURL(/learning\.oreilly\.review/, { timeout: 60000 });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
  });

  test('should log in as a Patron Validation user without password', async ({ page }) => {
    await page.goto('https://www.oreilly.review/library-access/');
    await page.locator('input[id="institutionAutocomplete"]').fill('Academic Patron Validation');
    await page.getByText('Academic Patron Validation').first().click({ force: true });
    await page.locator('[data-testid="email-input"] input').fill('qa+patron_validation@safaridemo.edu');
    await page.locator('[data-testid="submit"]').click({ force: true });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
  });

  test('should log in as a Patron Validation user with password', async ({ page }) => {
    await page.goto('https://www.oreilly.review/library-access/');
    await page.locator('input[id="institutionAutocomplete"]').fill('Academic Patron Validation');
    await page.getByText('Academic Patron Validation').first().click({ force: true });
    await page.locator('[data-testid="email-input"] input').fill('qa+pq_password@safaridemo.edu');
    await page.getByText('Sign in').first().click({ force: true });
    await page.locator('[data-testid="PasswordSignInForm"] input[id="password"]').fill('Test1234');
    await page.locator('[data-testid="SignInBtn"]').click({ force: true });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
  });

  test('should log in as a MLFA / Shibboleth direct sign in user', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/accounts/login-academic-check/?idp-slug=edugain-access-check');
    await page.locator('input[id="username"]').fill('user2245');
    await page.locator('input[id="password"]').fill('Phq81xXr4=');
    await page.getByText('Login').first().click({ force: true });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
  });

  test('should log in as a MLFA / Shibboleth sign in with institution user', async ({ page }) => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto('https://www.oreilly.review/library-access/');
      await page.locator('input[id="institutionAutocomplete"]').fill('eduGAIN access check');
      await page.getByText('eduGAIN access check').first().click({ force: true });
      await page.getByText('Sign in').first().click({ force: true });
      try {
        await page.locator('input[id="username"]').waitFor({ timeout: 30000 });
        break;
      } catch (e) {
        if (attempt === maxAttempts) throw e;
      }
    }
    await page.locator('input[id="username"]').fill('user2245');
    await page.locator('input[id="password"]').fill('Phq81xXr4=');
    await page.getByText('Login').first().click({ force: true });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').click({ force: true });
  });
});
