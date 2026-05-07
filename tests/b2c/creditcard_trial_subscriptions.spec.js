const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const { createNewUserInfo } = require('../../utils/user');
const { VIEWPORTS } = require('../../helpers/auth');

// NOTE: cy.frameLoaded / cy.iframe → page.frameLocator() in Playwright
// NOTE: cy.contains('Postal or zip code').type() → page.getByLabel('Postal or zip code').fill()
// NOTE: Cypress.on('uncaught:exception') not needed in Playwright

/** Fill the Zuora payment iframe with card details and submit. */
async function fillPaymentIframe(page, { cardNumber = '4456530000001005', expMonth = '09', expYear = '2028' } = {}) {
  const iframe = page.frameLocator('#z_hppm_iframe');
  await iframe.locator('input[name="field_creditCardHolderName"]').waitFor({ state: 'visible' });
  await iframe.locator('input[name="field_creditCardHolderName"]').fill('Card Holder');
  await iframe.locator('input[name="field_creditCardNumber"]').fill(cardNumber);
  await iframe.locator('#input-creditCardExpirationMonth').selectOption(expMonth);
  await iframe.locator('#input-creditCardExpirationYear').selectOption(expYear);
  await iframe.locator('input[name="field_cardSecurityCode"]').fill('001');
  await iframe.locator('#submitButton').click();
}

test.describe('B2C', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await page.goto('/');
  });

  test('should create a new b2c trial account', async ({ page }) => {
    test.setTimeout(120000);
    const newUser = createNewUserInfo({ type: 'b2cTrial' });
    await page.goto('/start-trial/');
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.getByText('Start free trial').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
    await page.goto('p/subscribe/');
    await expect(page.getByTestId('alertContainer')).toContainText("You are currently previewing the O\u2019Reilly Learning Platform.");
  });

  test('should create a new b2b trial account', async ({ page }) => {
    test.setTimeout(120000);
    const id = uuidv4();
    const newUser = createNewUserInfo({ type: 'b2bTrial' });
    await page.goto('/start-trial/');
    await page.getByText('For Business').click();
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="phone"]').fill('7075554444');
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('input[name="company"]').fill('B2B Trial Inc.');
    await page.locator('input[name="position"]').fill('CEO');
    await page.locator('[name="t_c_agreement"]').click();
    await page.getByText('Start free trial').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.waitForURL('**/manage-users/**', { timeout: 60000 });
    await expect(page.getByText('You have 4 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
    // Invite user
    await page.getByText('Invite Members').first().click({ force: true });
    await page.locator('input[name="firstName"]').fill('B2B Trial');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(`qa+b2bTrial_${id.substring(0, 13)}@oreillynet.com`);
    await page.getByText('Send Invite').first().click({ force: true });
    await expect(page.getByText('You have 3 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
    // Dismiss trial welcome modal if present
    const welcomeModal = page.frameLocator('iframe').locator('button:has-text("Get started")');
    if (await welcomeModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await welcomeModal.click();
    }
    // Deactivate User
    await page.evaluate(() => { const el = document.querySelector('.appcues'); if (el) el.remove(); });
    await page.locator('input[name="filter"]').fill('user');
    await page.locator('input[name="active"]').click();
    await page.getByRole('button', { name: 'Deactivate' }).click();
    // Reactivate User
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await page.locator('[name="valid-users-filter"]').waitFor();
    await page.locator('[name="valid-users-filter"]').selectOption('Deactivated');
    await page.locator('input[name="active"]').click();
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText('You have 3 available seats waiting to be filled.').first()).toBeVisible();
  });

  test('should create a new trial account with GDPR and a Monthly Subscription with a VAT exemption', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cTrial_Subscribe' });
    await page.goto('/start-trial/');
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.getByText('Start Free Trial').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
    await page.goto('p/subscribe/');
    await expect(page.getByTestId('alertContainer')).toContainText("You are currently previewing the O\u2019Reilly Learning Platform.");
    await page.locator('select[name="currencySelect"]').selectOption('Euro €');
    await page.getByText('Monthly', { exact: true }).waitFor();
    await page.getByText('Monthly', { exact: true }).click();
    await page.locator('select[name="billingCountry"]').selectOption('France');
    await page.locator('input[name="billingAddress"]').waitFor();
    await page.locator('input[name="billingAddress"]').fill('1 Main Street');
    await page.locator('input[name="billingCity"]').fill('Paris');
    await page.locator('input[name="billingPostalCode"]').fill('75000');
    await page.getByText('Apply a VAT exemption number').click();
    await page.locator('input[name="vatExemptionNumber"]').fill('No Vat For Me');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { expMonth: '12', expYear: '2027' });
    await expect(page.locator('body')).toContainText("Success! You are subscribed to the O\u2019Reilly Learning Platform.", { timeout: 60000 });
    await page.getByRole('link', { name: 'Plans & Payment' }).waitFor();
    await page.getByRole('link', { name: 'Plans & Payment' }).click();
    await page.getByText('Trial Plan, €0').click();
    await expect(page.getByText('You will next be billed for a Monthly plan at a rate of €43 (plus applicable tax/VAT) on').first()).toBeVisible();
  });

  test('should create a new paid user from Signup with GDPR, Promotion Code, VAT Charged, and a Payment update', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cSignupPromoVat' });
    await page.goto('signup/?promotion_code=flashsale21');
    await page.locator('select[name="currencySelect"]').selectOption('EUR');
    await page.getByRole('radio', { name: /Annual/ }).click();
    await page.getByText('Continue').first().click({ force: true });
    await page.locator('input[name="first_name"]').waitFor();
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('select[name="country"]').selectOption('Ireland');
    await page.locator('[name="t_c_agreement"]').click();
    await page.getByText('Create account').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.getByText('Credit or debit card', { exact: false }).first().click({ timeout: 60000 });
    await page.getByLabel('Postal or zip code').waitFor();
    await page.getByLabel('Postal or zip code').fill('D01 H104');
    await page.locator('select[name="field_creditCardCountry"]').selectOption('Ireland');
    await page.locator('input[name="creditCardAddress1"]').waitFor();
    await page.locator('input[name="creditCardAddress1"]').fill('1 Main Street');
    await page.locator('input[name="creditCardCity"]').fill('Dublin');
    await page.getByText('Continue').first().click();
    await expect(page.locator('[data-cy="cart-total"]')).toContainText('259');
    await fillPaymentIframe(page, { expMonth: '12', expYear: '2027' });
    await page.waitForURL(/home/, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.goto('p/subscribe');
    await expect(page.getByText('You will be charged €433').first()).toBeVisible();
    await page.goto('p/billing-history/');
    await expect(page.getByText('€318.57').first()).toBeVisible();
    // Payment update
    await page.goto('p/subscribe/');
    await page.getByText('Update Payment').click();
    await page.getByLabel('Postal or ZIP code').fill('D01 H104');
    await page.locator('select[name="billingCountry"]').selectOption('Ireland');
    await page.locator('input[name="billingAddress"]').fill('1 Main Street');
    await page.locator('input[name="billingCity"]').fill('Dublin');
    await page.evaluate(() => document.getElementById('onetrust-consent-sdk')?.remove());
    await page.getByRole('button', { name: 'Continue' }).click();
    await fillPaymentIframe(page, { expMonth: '12', expYear: '2027' });
  });

  test('should create a new Monthly paid user whose Credit Card will expire next month', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cSignup_cc_expire' });
    await page.goto('signup/');
    await page.getByText('Monthly', { exact: true }).click();
    await page.getByText('Continue').first().click({ force: true });
    await page.locator('input[name="first_name"]').waitFor();
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.locator('#create-account-button').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.getByLabel('Postal or zip code').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { expMonth: '05', expYear: '2026' });
    await page.waitForURL(/home/, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.goto('p/billing-history/');
    await expect(page.getByText('$49.00').first()).toBeVisible();
  });

  test('should create a new Annual paid user where billing country is India', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cSignup_cc_india' });
    await page.goto('signup/');
    await page.getByRole('radio', { name: /Annual/ }).click();
    await page.getByText('Continue').first().click({ force: true });
    await page.locator('input[name="first_name"]').waitFor();
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.locator('#create-account-button').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.getByLabel('Postal or zip code').fill('110003');
    await page.locator('select[name="field_creditCardCountry"]').selectOption('India');
    await page.locator('input[name="creditCardAddress1"]').waitFor();
    await page.locator('input[name="creditCardAddress1"]').fill('1 Main Street');
    await page.locator('input[name="creditCardCity"]').fill('New Delhi');
    await page.getByText('Continue').first().click();
    await page.locator('[data-cy="cart-total"]').waitFor();
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { cardNumber: '4111111111111111', expMonth: '10', expYear: '2029' });
    await page.waitForURL(/home/, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.goto('p/billing-history/');
    await expect(page.getByText('$588.82').first()).toBeVisible();
  });

  test('should create a new Three Month paid user that changes their Plan to Annual', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cSignup_changeplan' });
    await page.goto('signup/');
    await page.getByText('Three Month', { exact: true }).click();
    await page.getByText('Continue').first().click({ force: true });
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.locator('#create-account-button').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.getByLabel('Postal or zip code').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { expMonth: '10', expYear: '2029' });
    await page.waitForURL(/home/, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.goto('p/billing-history/');
    await expect(page.getByText('$129.00').first()).toBeVisible();
    await page.goto('p/subscribe/');
    await page.getByText('Change Plan').click();
    await page.getByRole('radio', { name: /Annual/ }).click();
    await page.getByText('Confirm Change').click();
    await expect(page.locator('[data-testid="activeNextBill"]')).toContainText('You will be charged $499');
  });

  test('should create a new Monthly paid user that cancels', async ({ page }) => {
    test.setTimeout(180000);
    const newUser = createNewUserInfo({ type: 'b2cSignup_cancel' });
    await page.goto('signup/');
    await page.getByText('Monthly', { exact: true }).click();
    await page.getByText('Continue').first().click({ force: true });
    await page.locator('input[name="first_name"]').fill(newUser.firstName);
    await page.locator('input[name="last_name"]').fill(newUser.lastName);
    await page.locator('input[name="email"]').fill(newUser.email);
    await page.locator('input[name="password"]').fill(newUser.password);
    await page.locator('[name="t_c_agreement"]').click();
    await page.locator('#create-account-button').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.getByLabel('Postal or zip code').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { expMonth: '01', expYear: '2030' });
    await page.waitForURL(/home/, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.goto('p/billing-history/');
    await expect(page.getByText('$49.00').first()).toBeVisible();
    await page.goto('p/subscribe/');
    await expect(page.getByText('Monthly Plan, $49 per month').first()).toBeVisible();
    await page.getByText('Cancel Plan').click();
    await page.getByText('Finish Cancellation').click();
    await expect(page.getByText('Restart Membership').first()).toBeVisible();
    await expect(page.locator('[data-testid="pendingCancellationNextBill"]')).toContainText('Your membership will be cancelled on');
  });

  test('should create a new 30 Day Complimentary User', async ({ page }) => {
    test.setTimeout(120000);
    const newUser = createNewUserInfo({ type: 'b2cComp_30day' });
    await page.goto('get-learning/');
    await expect(page.getByText('Activate Your Membership').first()).toBeVisible();
    await page.getByRole('textbox', { name: 'First name' }).fill(newUser.firstName);
    await page.getByRole('textbox', { name: 'Last name' }).fill(newUser.lastName);
    await page.getByRole('textbox', { name: 'Email address' }).fill(newUser.email);
    await page.locator('input[type="password"]').fill(newUser.password);
    await page.getByRole('checkbox').click();
    await page.getByRole('textbox', { name: 'Promo code' }).fill('30day');
    await page.getByRole('button', { name: 'Activate account' }).click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
    await page.goto('/p/subscribe/');
    await page.getByRole('link', { name: 'Plans & Payment' }).click();
    await expect(page.locator('body')).toContainText("Your Complimentary Access to the O\u2019Reilly Learning Platform will end on");
  });
});
