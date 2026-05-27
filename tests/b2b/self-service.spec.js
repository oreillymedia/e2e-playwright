const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const { createNewUserInfo } = require('../../utils/user');
const { VIEWPORTS } = require('../../helpers/auth');

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

/** After fillPaymentIframe, handle potential 3DS callbacks that redirect back to team-setup.
 *  Some upgrade flows briefly show team-setup before auto-navigating to manage-users.
 *  Others need a second form fill. We distinguish by checking if the submit button
 *  stays enabled (form ready to fill) vs becomes disabled (payment auto-processing). */
async function waitForPaymentComplete(page) {
  await page.waitForURL(/manage-users|team-setup/, { timeout: 60000 });
  if (page.url().includes('manage-users')) return;

  // On team-setup after 3DS callback — check submit button state
  const submitBtn = page.frameLocator('#z_hppm_iframe').locator('#submitButton');
  let buttonEnabled = false;
  try {
    await submitBtn.waitFor({ state: 'attached', timeout: 5000 });
    const ariaDisabled = await submitBtn.getAttribute('aria-disabled');
    const classAttr = await submitBtn.getAttribute('class');
    buttonEnabled = ariaDisabled !== 'true' && !(classAttr && classAttr.includes('disabled'));
  } catch {
    buttonEnabled = false;
  }

  if (!buttonEnabled) {
    // Payment is processing — race between success (manage-users) and failure (Payment Failed)
    await Promise.race([
      page.waitForURL('**/manage-users/**', { timeout: 90000 }),
      page.locator('h4:has-text("Payment Failed")').waitFor({ state: 'visible', timeout: 90000 })
        .then(() => { throw new Error('Zuora payment processing failed'); }),
    ]);
    return;
  }

  // Button is enabled — wait briefly to confirm it's not just a transient state
  await page.waitForTimeout(2000);
  if (!page.url().includes('team-setup')) {
    if (!page.url().includes('manage-users')) {
      await page.waitForURL('**/manage-users/**', { timeout: 60000 });
    }
    return;
  }

  // Re-check outside try/catch so waitForURL timeout propagates correctly
  let stillEnabled = true;
  try {
    const ariaDisabled = await submitBtn.getAttribute('aria-disabled');
    const classAttr = await submitBtn.getAttribute('class');
    stillEnabled = ariaDisabled !== 'true' && !(classAttr && classAttr.includes('disabled'));
  } catch {
    stillEnabled = false;
  }

  if (!stillEnabled) {
    await Promise.race([
      page.waitForURL('**/manage-users/**', { timeout: 90000 }),
      page.locator('h4:has-text("Payment Failed")').waitFor({ state: 'visible', timeout: 90000 })
        .then(() => { throw new Error('Zuora payment processing failed'); }),
    ]);
    return;
  }

  // Form is ready — fill and submit again
  await fillPaymentIframe(page);
  await page.waitForURL('**/manage-users/**', { timeout: 60000 });
}

test.describe('Create New SS', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  test('should create a new self-service account, add users, buy seats, Deactivate/Reactivate', async ({ page }) => {
    test.setTimeout(300000);
    const id = uuidv4();
    // Account creation
    await page.goto('team-setup/');
    await page.locator('input[name="companyName"]').fill(`Self-Service ${id.substring(0, 13)} Inc.`);
    await page.getByText('Continue').first().click();
    // Admin user creation
    await page.locator('input[name="firstName"]').waitFor();
    await page.locator('input[name="firstName"]').fill('SS');
    await page.locator('input[name="lastName"]').fill('Manager');
    await page.locator('input[name="email"]').fill(`qa+ss_${id.substring(0, 13)}@oreillynet.com`);
    await page.locator('input[name="password"]').fill('Testing_12345');
    await page.locator('[data-testid="t-termsAgreementCheckbox"]').click();
    await page.locator('#userInfoContinueButton').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    // Payment
    await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page);
    await waitForPaymentComplete(page);
    await expect(page.getByText('You have 1 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
    // Invite user
    await page.getByText('Invite Members').first().click({ force: true });
    await page.locator('input[name="firstName"]').fill('SS');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(`qa+ss_user${id.substring(0, 13)}@oreillynet.com`);
    await page.getByText('Send Invite').first().click({ force: true });
    await page.getByRole('dialog', { name: 'Invite a new member' }).waitFor({ state: 'detached', timeout: 30000 });
    // Purchase Seats
    await page.getByText('Purchase Seats').first().click({ force: true });
    for (let i = 0; i < 4; i++) {
      await page.locator('[aria-label="Add one seat"]').click({ force: true });
    }
    await expect(page.getByText('$2495.00').first()).toBeVisible();
    await page.locator('[type="submit"]').click({ force: true });
    await page.getByRole('button', { name: 'Yes, Purchase' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Yes, Purchase' }).click();
    await expect(page.getByText('You have 5 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
    // Deactivate User
    await page.locator('input[name="filter"]').fill('user');
    await page.locator('input[name="active"]').click();
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByText('You have 6 available seats waiting to be filled.').first()).toBeVisible();
    // Reactivate User
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await page.locator('[name="valid-users-filter"]').waitFor();
    await page.locator('[name="valid-users-filter"]').selectOption('Deactivated');
    await page.locator('input[name="active"]').waitFor({ state: 'visible' });
    await page.locator('input[name="active"]').click();
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText('You have 5 available seats waiting to be filled.').first()).toBeVisible();
  });

  test('should create a new self-service account with Euros', async ({ page }) => {
    test.setTimeout(180000);
    const id = uuidv4();
    // Account creation
    await page.goto('team-setup/');
    await page.locator('input[name="companyName"]').fill(`Euro Self-Service ${id.substring(0, 13)} Inc.`);
    await page.locator('select[name="currencySelect"]').selectOption('EUR');
    for (let i = 0; i < 6; i++) {
      await page.getByText('+', { exact: true }).first().click();
    }
    await page.getByText('Continue').first().click();
    // Admin user creation
    await page.locator('input[name="firstName"]').waitFor();
    await page.locator('input[name="firstName"]').fill('SS');
    await page.locator('input[name="lastName"]').fill('Manager');
    await page.locator('input[name="email"]').fill(`qa+ss_${id.substring(0, 13)}@oreillynet.com`);
    await page.locator('input[name="password"]').fill('Testing_12345');
    await page.locator('[data-testid="t-termsAgreementCheckbox"]').click();
    await page.locator('#userInfoContinueButton').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    // Payment
    await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Billing country is the same as my home').click();
    await page.locator('input[name="homePostalCode"]').fill('75000');
    await page.locator('select[name="field_country"]').selectOption('France');
    await page.locator('input[name="homeAddress1"]').fill('1 Home Street');
    await page.locator('input[name="homeCity"]').fill('Paris');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page, { cardNumber: '5555555555554444', expMonth: '12', expYear: '2031' });
    await waitForPaymentComplete(page);
    await expect(page.getByText('You have 7 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
  });

  // TODO: update this post "enterprise trial" launch as the test will not work in both the QA & prod env yet as the feature flags are different
  test('should create a new b2c trial account that upgrades to a b2b Self-Service', async ({ page }) => {
    test.setTimeout(180000);
    const id = uuidv4();
    const newUser = createNewUserInfo({ type: 'Trial_Self-Service' });
    await page.goto('/start-trial/');
    await page.getByRole('textbox', { name: 'First name' }).fill(newUser.firstName);
    await page.getByRole('textbox', { name: 'Last name' }).fill(newUser.lastName);
    await page.getByRole('textbox', { name: 'Email address' }).fill(newUser.email);
    await page.locator('input[type="password"]').fill(newUser.password);
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Start free trial' }).click();
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
    await page.goto('team-setup/');
    await page.waitForURL(/team-setup/, { timeout: 30000 });
    // Account creation
    await page.locator('input[name="companyName"]').fill(`Former Trial Self-Service ${id.substring(0, 13)} Inc.`);
    await page.getByText('Continue').first().click();
    // Payment
    await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page);
    await waitForPaymentComplete(page);
    await expect(page.getByText('You have 1 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
  });

  test('should create a new b2c paid account that upgrades to a b2b Self-Service', async ({ page }) => {
    test.setTimeout(180000);
    const id = uuidv4();
    const newUser = createNewUserInfo({ type: 'Paid_Self-Service' });
    await page.goto('signup/');
    await page.getByText('Monthly', { exact: true }).click();
    await page.getByText('Continue').first().click();
    await page.getByRole('textbox', { name: 'First name' }).waitFor();
    await page.getByRole('textbox', { name: 'First name' }).fill(newUser.firstName);
    await page.getByRole('textbox', { name: 'Last name' }).fill(newUser.lastName);
    await page.getByRole('textbox', { name: 'Email address' }).fill(newUser.email);
    await page.locator('input[type="password"]').fill(newUser.password);
    await page.getByRole('checkbox').click();
    await page.locator('#create-account-button').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    await page.locator('input[name="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page);
    await page.waitForURL(/home/, { timeout: 60000 });
    await page.locator('[data-testid="toggle-popover-my-oreilly"]').waitFor({ timeout: 60000 });
    await page.goto('team-setup/');
    await page.waitForURL(/team-setup/, { timeout: 30000 });
    // Account creation
    await page.locator('input[name="companyName"]').fill(`Former B2C Paid Self-Service ${id.substring(0, 13)} Inc.`);
    await page.getByText('Continue').first().click();
    // Payment
    await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page);
    await waitForPaymentComplete(page);
    await expect(page.getByText('You have 1 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
  });

  // **Disabled: the "For Business" flow on /start-trial/ has been turned off in the UI.
  // **Restore this test when the b2b trial signup is re-enabled.
  // test('should create a new b2b trial account', async ({ page }) => {
  //   test.setTimeout(120000);
  //   const id = uuidv4();
  //   const newUser = createNewUserInfo({ type: 'b2bTrial' });
  //   await page.goto('/start-trial/');
  //   await page.getByText('For Business').click();
  //   await page.locator('input[name="first_name"]').fill(newUser.firstName);
  //   await page.locator('input[name="last_name"]').fill(newUser.lastName);
  //   await page.locator('input[name="email"]').fill(newUser.email);
  //   await page.locator('input[name="phone"]').fill('7075554444');
  //   await page.locator('input[name="password"]').fill(newUser.password);
  //   await page.locator('input[name="company"]').fill('B2B Trial Inc.');
  //   await page.locator('input[name="position"]').fill('CEO');
  //   await page.locator('[name="t_c_agreement"]').click();
  //   await page.getByText('Start free trial').click();
  //   await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
  //   await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
  //   await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
  //   await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
  //   await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
  //   await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
  //   await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
  //   await page.waitForURL('**/manage-users/**', { timeout: 60000 });
  //   await expect(page.getByText('You have 4 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
  //   // Invite user
  //   await page.getByText('Invite Members').first().click({ force: true });
  //   await page.locator('input[name="firstName"]').fill('B2B Trial');
  //   await page.locator('input[name="lastName"]').fill('User');
  //   await page.locator('input[name="email"]').fill(`qa+b2bTrial_${id.substring(0, 13)}@oreillynet.com`);
  //   await page.getByText('Send Invite').first().click({ force: true });
  //   await expect(page.getByText('You have 3 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
  //   // Dismiss trial welcome modal if present
  //   const welcomeModal = page.frameLocator('iframe').locator('button:has-text("Get started")');
  //   if (await welcomeModal.isVisible({ timeout: 5000 }).catch(() => false)) {
  //     await welcomeModal.click();
  //   }
  //   // Deactivate User
  //   await page.evaluate(() => { const el = document.querySelector('.appcues'); if (el) el.remove(); });
  //   await page.locator('input[name="filter"]').fill('user');
  //   await page.locator('input[name="active"]').click();
  //   await page.getByRole('button', { name: 'Deactivate' }).click();
  //   // Reactivate User
  //   await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  //   await page.locator('[name="valid-users-filter"]').waitFor();
  //   await page.locator('[name="valid-users-filter"]').selectOption('Deactivated');
  //   await page.locator('input[name="active"]').click();
  //   await page.getByRole('button', { name: 'Activate' }).click();
  //   await expect(page.getByText('You have 3 available seats waiting to be filled.').first()).toBeVisible();
  // });

  test('should create a new self-service account with a Payment Update and Cancellation', async ({ page }) => {
    test.setTimeout(180000);
    const id = uuidv4();
    const newUser = createNewUserInfo({ type: 'Future_Cancel_Self-Service' });
    await page.goto('team-setup/');
    await page.locator('input[name="companyName"]').waitFor();
    await page.locator('input[name="companyName"]').fill(`Future Cancel Self-Service ${id.substring(0, 13)} Inc.`);
    for (let i = 0; i < 6; i++) {
      await page.getByText('+', { exact: true }).first().click({ force: true });
    }
    await page.getByText('Continue').first().click({ force: true });
    // Admin user creation
    await page.locator('input[name="firstName"]').waitFor();
    await page.locator('input[name="firstName"]').fill('SS');
    await page.locator('input[name="lastName"]').fill('Manager');
    await page.locator('input[name="email"]').fill(`qa+ss_${id.substring(0, 13)}@oreillynet.com`);
    await page.locator('input[name="password"]').fill('Testing_12345');
    await page.locator('[data-testid="t-termsAgreementCheckbox"]').click();
    await page.locator('#userInfoContinueButton').click();
    await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
    await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
    await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
    await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
    await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
    await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
    await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
    // Payment
    await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
    await page.getByText('Continue').first().click({ force: true });
    await fillPaymentIframe(page);
    await waitForPaymentComplete(page);
    await expect(page.getByText('You have 7 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
    // Update Payment
    await page.getByRole('link', { name: 'Plans & Payment' }).click();
    await page.getByText('Update Payment').click();
    await page.locator('input[name="creditCardNumber"]').fill('5555555555554444');
    await page.locator('input[name="creditCardExpiration"]').clear();
    await page.locator('input[name="creditCardExpiration"]').fill('10/31');
    await page.locator('input[name="cardSecurityCode"]').fill('456');
    await page.locator('input[name="field_creditCardPostalCode"]').clear();
    await page.locator('input[name="field_creditCardPostalCode"]').fill('95404');
    await page.locator('textarea[name="additionalInfo"]').fill('Additional Payment Info');
    await page.evaluate(() => document.getElementById('onetrust-consent-sdk')?.remove());
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText('Success! Your payment method has been updated.').first()).toBeVisible();
    // Cancel
    await page.evaluate(() => document.getElementById('onetrust-consent-sdk')?.remove());
    await page.getByRole('link', { name: 'Cancel Plan' }).click();
    await expect(page.locator('[data-testid="loadingODot"]')).not.toBeVisible();
    await page.getByRole('button', { name: 'Finish Cancellation' }).click();
    await expect(page.getByText('Your membership is scheduled to be cancelled on').first()).toBeVisible();
  });
});
