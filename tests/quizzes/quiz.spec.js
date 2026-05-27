const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const { login, VIEWPORTS } = require('../../helpers/auth');
const { fillPaymentIframe, waitForPaymentComplete } = require('../../utils/payment');
const { fillMFACode } = require('../../utils/mfa');

test.describe('Quizzes', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  test.describe('Quiz Access', () => {
    test('Create a Self-Serve B2B user, take a practice quiz, take a final quiz, re-take a final quiz', async ({ page }) => {
      test.setTimeout(300000);
      const id = uuidv4();
      // Account creation
      await page.goto('team-setup/');
      await page.waitForTimeout(250);
      await page.locator('input[name="companyName"]').fill(`Self-Service ${id.substring(0, 13)} Quiz Inc.`);
      await page.locator('select[name="currencySelect"]').selectOption('USD');
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
      await fillMFACode(page);
      // Payment
      await page.locator('input[id="field_creditCardPostalCode"]').fill('90210');
      await page.getByText('Continue').first().click({ force: true });
      await fillPaymentIframe(page);
      await waitForPaymentComplete(page);
      await expect(page.getByText('You have 7 available seats waiting to be filled.').first()).toBeVisible({ timeout: 60000 });
      // Practice quiz
      await page.goto('videos/python-fundamentals/9780135917411/quiz/9781234567/589e22e3-d6a8-4b7d-8e28-56ac983544f3/');
      await page.evaluate(() => {
        document.getElementById('onetrust-consent-sdk')?.remove();
        document.querySelector('[class*="_certsContainer_"]')?.remove();
      });
      // Learnosity hides the real <input> via CSS and proxies clicks via the label,
      // so Playwright's visibility check fails — use { force: true } on all quiz answers.
      await page.getByRole('radio', { name: 'Microsoft SQL Server' }).click({ force: true });
      await page.getByText('Check Answer').first().click();
      await page.getByText('Next').first().click();
      await page.getByRole('radio', { name: 'No, the table is not normalized.' }).click({ force: true });
      await page.getByText('Next').first().click();
      await page.getByRole('radio', { name: 'False' }).click({ force: true });
      await page.getByText('Next').first().click();
      await page.getByRole('checkbox', { name: 'Flower' }).click({ force: true });
      await page.getByText('Finish').first().click();
      await page.getByText('Yes').first().click({ force: true });
      await expect(page.getByText('You got 75% correct').first()).toBeVisible();
      // Final quiz (re-take)
      await page.getByText('Continue to next section').first().click({ force: true });
      await page.evaluate(() => {
        document.getElementById('onetrust-consent-sdk')?.remove();
        document.querySelector('[class*="_certsContainer_"]')?.remove();
      });
      await page.getByRole('radio', { name: 'Microsoft SQL Server' }).click({ force: true });
      await page.getByText('Next').first().click();
      await page.getByRole('radio', { name: 'No, the table is not normalized.' }).click({ force: true });
      await page.getByText('Next').first().click();
      await page.getByRole('radio', { name: 'False' }).click({ force: true });
      await page.getByText('Next').first().click();
      await page.getByRole('checkbox', { name: 'Lion' }).click({ force: true });
      await page.getByRole('checkbox', { name: 'Monkey' }).click({ force: true });
      await page.getByText('Finish').first().click();
      await page.getByText('Yes').first().click({ force: true });
      await expect(page.getByText('You got 100% correct').first()).toBeVisible();
    });

    test('should login as an Academic B2B user, redirects to detail page when accessing Practice/Final quizzes', async ({ page }) => {
      await login(page, { type: 'b2bAcademic' });
      await page.goto('/videos/python-fundamentals/9780135917411/quiz/9781234567/32c44eee-4777-4341-b29b-d6a5bfd1d0ad/');
      await expect(page.getByText('Instructional content for a learner that already has a working knowledge of the concepts for this topic domain.').first()).toBeVisible();
      await page.goto('/videos/python-fundamentals/9780135917411/quiz/9781234567/0b5d581b-39b6-4cd0-8a56-f8a9868822ea/');
      await expect(page.getByText('Instructional content for a learner that already has a working knowledge of the concepts for this topic domain.').first()).toBeVisible();
    });

    test('should login as a B2C Subscriber, redirects to detail page when accessing Practice/Final quizzes', async ({ page }) => {
      await login(page, { type: 'b2cSubscriber' });
      await page.goto('/videos/python-fundamentals/9780135917411/quiz/9781234567/32c44eee-4777-4341-b29b-d6a5bfd1d0ad/');
      await expect(page.getByText('Instructional content for a learner that already has a working knowledge of the concepts for this topic domain.').first()).toBeVisible();
      await page.goto('/videos/python-fundamentals/9780135917411/quiz/9781234567/0b5d581b-39b6-4cd0-8a56-f8a9868822ea/');
      await expect(page.getByText('Instructional content for a learner that already has a working knowledge of the concepts for this topic domain.').first()).toBeVisible();
    });
  });
});
