const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const { login, VIEWPORTS } = require('../../helpers/auth');

// NOTE: The self-service quiz test uses an older payment form (not the Zuora iframe).
// If the payment page has changed, the card input selectors may need updating.

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
      await page.locator('input[name="companyName"]').fill(`Future Cancel Self-Service ${id.substring(0, 13)} Inc.`);
      await page.locator('select[name="industry"]').selectOption('Insurance');
      await page.locator('select[name="currencySelect"]').selectOption('USD');
      for (let i = 0; i < 6; i++) {
        await page.getByText('+', { exact: true }).first().click();
      }
      await page.getByText('Continue').first().click();
      // Admin user creation
      await page.locator('input[name="firstName"]').fill('SS');
      await page.locator('input[name="lastName"]').fill('Manager');
      await page.locator('input[name="email"]').fill(`qa+ss_${id.substring(0, 13)}@safaribooksonline.com`);
      await page.locator('input[name="password"]').fill('Test1234');
      await page.locator('#userInfoContinueButton').click();
      await page.waitForTimeout(250);
      await page.locator('input[aria-label="digit 1 of 6"]').pressSequentially('a');
      await page.locator('input[aria-label="digit 2 of 6"]').pressSequentially('b');
      await page.locator('input[aria-label="digit 3 of 6"]').pressSequentially('c');
      await page.locator('input[aria-label="digit 4 of 6"]').pressSequentially('1');
      await page.locator('input[aria-label="digit 5 of 6"]').pressSequentially('2');
      await page.locator('input[aria-label="digit 6 of 6"]').pressSequentially('3');
      // Payment (older non-iframe form)
      await expect(page.locator('input[name="field_creditCardHolderName"]')).toBeVisible({ timeout: 60000 });
      await page.locator('input[name="field_creditCardHolderName"]').fill('Self Service');
      await page.locator('input[name="creditCardNumber"]').fill('4111111111111111');
      await page.getByText('Expiration date').click();
      await page.locator('input[name="creditCardExpiration"]').fill('06/29');
      await page.locator('input[name="cardSecurityCode"]').fill('123');
      await page.locator('input[name="field_creditCardPostalCode"]').fill('90210');
      await expect(page.getByText('you agree to pay $3992').first()).toBeVisible();
      await page.getByText('Purchase now').first().click({ force: true });
      await expect(page.getByText('User Management').first()).toBeVisible({ timeout: 60000 });
      // Practice quiz
      await page.goto('videos/python-fundamentals/9780135917411/quiz/9781234567/589e22e3-d6a8-4b7d-8e28-56ac983544f3/');
      await page.getByText('Microsoft SQL Server').click();
      await page.getByText('Check Answer').click();
      await expect(page.getByText('Correct').first()).toBeVisible();
      await page.getByText('Next').click();
      await page.getByText('No, the table is not normalized.').click();
      await page.getByText('Next').click();
      await page.getByText('False').click();
      await page.getByText('Next').click();
      await page.getByText('Flower').click();
      await page.getByText('Finish').click();
      await page.getByText('Yes').click();
      await expect(page.getByText('You got 75% correct').first()).toBeVisible();
      // Final quiz (re-take)
      await page.getByText('Continue to next section').click();
      await page.getByText('Microsoft SQL Server').click();
      await page.getByText('Next').click();
      await page.getByText('No, the table is not normalized.').click();
      await page.getByText('Next').click();
      await page.getByText('False').click();
      await page.getByText('Next').click();
      await page.getByText('Lion').click();
      await page.getByText('Monkey').click();
      await page.getByText('Finish').click();
      await page.getByText('Yes').click();
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
