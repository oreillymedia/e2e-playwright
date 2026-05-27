/** Fill the 6-digit MFA code into the standard digit inputs. Default 'abc123' matches test fixtures. */
async function fillMFACode(page, digits = 'abc123') {
  if (digits.length !== 6) throw new Error(`fillMFACode expects 6 chars, got ${digits.length}`);
  await page.locator('input[aria-label="digit 1 of 6"]').waitFor();
  for (let i = 0; i < 6; i++) {
    await page.locator(`input[aria-label="digit ${i + 1} of 6"]`).pressSequentially(digits[i]);
  }
}

module.exports = { fillMFACode };
