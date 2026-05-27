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

/** After fillPaymentIframe, handle potential 3DS callbacks that redirect back to team-setup. */
async function waitForPaymentComplete(page) {
  await page.waitForURL(/manage-users|team-setup/, { timeout: 90000 });
  if (page.url().includes('manage-users')) return;

  // Brief settle so the iframe finishes reloading after the 3DS callback
  await page.waitForTimeout(3000);

  const submitBtn = page.frameLocator('#z_hppm_iframe').locator('#submitButton');
  let buttonEnabled;
  try {
    await submitBtn.waitFor({ state: 'attached', timeout: 5000 });
    const ariaDisabled = await submitBtn.getAttribute('aria-disabled');
    const classAttr = await submitBtn.getAttribute('class');
    buttonEnabled = ariaDisabled !== 'true' && !(classAttr && classAttr.includes('disabled'));
  } catch {
    buttonEnabled = false;
  }

  if (!buttonEnabled) {
    await Promise.race([
      page.waitForURL('**/manage-users/**', { timeout: 90000 }),
      page.locator('h4:has-text("Payment Failed")').waitFor({ state: 'visible', timeout: 90000 })
        .then(() => { throw new Error('Zuora payment processing failed'); }),
    ]);
    return;
  }

  await page.waitForTimeout(2000);
  if (!page.url().includes('team-setup')) {
    if (!page.url().includes('manage-users')) {
      await page.waitForURL('**/manage-users/**', { timeout: 60000 });
    }
    return;
  }

  let stillEnabled;
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

  await fillPaymentIframe(page);
  await page.waitForURL('**/manage-users/**', { timeout: 60000 });
}

module.exports = { fillPaymentIframe, waitForPaymentComplete };
