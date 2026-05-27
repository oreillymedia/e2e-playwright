const { test, expect } = require('@playwright/test');
const { createNewUserInfo } = require('../../utils/user');
const { VIEWPORTS } = require('../../helpers/auth');
const { fillMFACode } = require('../../utils/mfa');

// NOTE: cy.origin() for PayPal sandbox cross-origin flow is not needed in Playwright —
// cross-origin navigation is handled natively. Just interact with the PayPal page directly.

test.describe('Create PayPal Subscriber', () => {
  test.describe.configure({ mode: 'parallel' });
  test.describe('b2c', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await page.setViewportSize(VIEWPORTS['macbook-15']);
      await page.goto('/');
    });

    test('should create a new trial account and subscribe with PayPal', async ({ page }) => {
      test.setTimeout(180000);
      const newUser = createNewUserInfo({ type: 'b2cTrial_PayPal' });
      await page.goto('/start-trial/');
      await page.locator('input[name="first_name"]').fill(newUser.firstName);
      await page.locator('input[name="last_name"]').fill(newUser.lastName);
      await page.locator('input[name="email"]').fill(newUser.email);
      await page.locator('input[name="password"]').fill(newUser.password);
      await page.locator('[name="t_c_agreement"]').click();
      await page.getByText('Start free trial').click();
      await fillMFACode(page);
      await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
      await page.goto('p/subscribe/');
      await page.getByRole('radio', { name: /Annual/ }).click();
      await page.locator('#payment-choice-pp').click();
      await page.getByLabel('Postal or ZIP code').waitFor();
      await page.getByLabel('Postal or ZIP code').fill('95472');
      await page.getByText('Continue').click();
      // Playwright handles PayPal cross-origin natively
      await page.getByRole('textbox', { name: 'Email or mobile number' }).fill('jburt+paypal@oreilly.com');
      await page.getByRole('button', { name: 'Next' }).click();
      // Wait for password step - "Change user" button appears only on the password step
      await page.getByRole('button', { name: /Change/ }).waitFor({ state: 'visible' });
      await page.locator('input[type="password"]').click();
      await page.locator('input[type="password"]').fill('Test1234');
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.getByRole('button', { name: 'Agree and Continue' }).click();
      await page.waitForURL(/learning\.oreilly\.review/, { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.goto('p/subscribe/');
      await expect(page.getByText('You will next be billed for an annual plan at a rate of $499').first()).toBeVisible({ timeout: 60000 });
    });

    test('should create a new paid user with a Promotion Code and PayPal', async ({ page }) => {
      test.setTimeout(180000);
      const newUser = createNewUserInfo({ type: 'b2cSignupPromo_PayPal' });
      await page.goto('signup/?promotion_code=letsgo21');
      await page.getByRole('radio', { name: /Annual/ }).click();
      await page.getByText('Continue').click();
      await page.getByRole('textbox', { name: 'First name' }).fill(newUser.firstName);
      await page.getByRole('textbox', { name: 'Last name' }).fill(newUser.lastName);
      await page.getByRole('textbox', { name: 'Email address' }).fill(newUser.email);
      await page.locator('input[type="password"]').fill(newUser.password);
      await page.getByRole('checkbox').click();
      await page.locator('#create-account-button').click();
      await fillMFACode(page);
      await page.locator('#payment-choice-pp').click();
      await page.getByLabel('Postal or zip code').fill('95472');
      await page.getByText('Continue').click();
      // Playwright handles PayPal cross-origin natively
      await page.getByRole('textbox', { name: 'Email or mobile number' }).fill('jburt+paypal@oreilly.com');
      await page.getByRole('button', { name: 'Next' }).click();
      // Wait for password step - "Change user" button appears only on the password step
      await page.getByRole('button', { name: /Change/ }).waitFor({ state: 'visible' });
      await page.locator('input[type="password"]').click();
      await page.locator('input[type="password"]').fill('Test1234');
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.getByRole('button', { name: 'Agree and Continue' }).click();
      await page.waitForURL(/learning\.oreilly\.review/, { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.goto('p/subscribe/');
      await expect(page.getByText('Annual Plan, $299').first()).toBeVisible();
    });

    test('should create a new Monthly paid PayPal user that cancels', async ({ page }) => {
      test.setTimeout(180000);
      const newUser = createNewUserInfo({ type: 'b2cSignup_pp_cancel' });
      await page.goto('signup/');
      await page.getByText('Monthly', { exact: true }).click();
      await page.getByText('Continue').first().click({ force: true });
      await page.getByRole('textbox', { name: 'First name' }).fill(newUser.firstName);
      await page.getByRole('textbox', { name: 'Last name' }).fill(newUser.lastName);
      await page.getByRole('textbox', { name: 'Email address' }).fill(newUser.email);
      await page.locator('input[type="password"]').fill(newUser.password);
      await page.getByRole('checkbox').click();
      await page.locator('#create-account-button').click();
      await fillMFACode(page);
      await page.locator('#payment-choice-pp').click();
      await page.getByLabel('Postal or zip code').fill('95472');
      await page.getByText('Continue').click();
      // Playwright handles PayPal cross-origin natively
      await page.getByRole('textbox', { name: 'Email or mobile number' }).fill('jburt+paypal@oreilly.com');
      await page.getByRole('button', { name: 'Next' }).click();
      // Wait for password step - "Change user" button appears only on the password step
      await page.getByRole('button', { name: /Change/ }).waitFor({ state: 'visible' });
      await page.locator('input[type="password"]').click();
      await page.locator('input[type="password"]').fill('Test1234');
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.getByRole('button', { name: 'Agree and Continue' }).click();
      await page.waitForURL(/learning\.oreilly\.review/, { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.goto('p/subscribe/');
      await expect(page.getByText('Monthly Plan, $49 per month').first()).toBeVisible();
      await page.getByRole('link', { name: 'Cancel Plan' }).click();
      await page.getByRole('button', { name: 'Finish Cancellation' }).click();
      await expect(page.getByText('Restart Membership').first()).toBeVisible();
      await expect(page.locator('[data-testid="pendingCancellationNextBill"]')).toContainText('Your membership will be cancelled on');
    });
  });
});
