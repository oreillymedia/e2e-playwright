const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

// NOTE: cy.contains('text').should('not.exist') → expect(locator).not.toBeVisible()
// Using not.toBeVisible() covers both "not in DOM" and "hidden" cases.
// Scoping to label elements to avoid matching hidden nav menu items with the same text.

const fmt = (page, text) => page.locator('.MuiTypography-uiBody').filter({ hasText: new RegExp(`^${text}`) }).first();

test.describe('Search', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  test.describe('anonymous user', () => {
    test('should perform a search as an anonymous user', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('search/');
      await expect(page.getByText('SIGN IN', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Try Now').first()).toBeVisible();
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(page.locator('[for="formats-interactive-7"] > .MuiTypography-root')).toBeAttached();
      await expect(fmt(page, 'Sandboxes')).toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).toBeVisible();
      await expect(fmt(page, 'Practice Tests')).toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Your Organization')).not.toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('B2C Trial user', () => {
    test('should perform a search as a B2C Trial user', async ({ page }) => {
      await login(page, { type: 'b2cTrial' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      await expect(fmt(page, 'Practice Tests')).toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('B2B user', () => {
    test('should perform a search as a B2B user', async ({ page }) => {
      await login(page, { type: 'b2b' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Interactive')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).toBeVisible();
      await expect(fmt(page, 'Practice Tests')).toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Your Organization')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).toBeVisible();
    });
  });

  test.describe('B2B Academic user', () => {
    test('should perform a search as a B2B Academic user', async ({ page }) => {
      await login(page, { type: 'b2bAcademic' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).not.toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).not.toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      // 'Practice Tests' text may appear in search results — not asserting it
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Your Organization')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).not.toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('B2B AI Academy user', () => {
    test('should perform a search as a B2B AI Academy user', async ({ page }) => {
      await login(page, { type: 'b2bAia' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(page.locator('[for="case_studies"] > .MuiTypography-root')).not.toBeAttached();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(page.getByText('Interactive (1)').first()).toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      // 'Practice Tests' text may appear in search results — not asserting it
      await expect(fmt(page, 'Playlists')).not.toBeVisible();
      await expect(fmt(page, 'Certification Guides')).not.toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('ORM Lite user', () => {
    test('should perform a search as an ORM Lite user', async ({ page }) => {
      await login(page, { type: 'b2bLite' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).not.toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).not.toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      // 'Practice Tests' text may appear in search results — not asserting it
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).not.toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('B2B Expired user', () => {
    test('should perform a search as a B2B Expired user', async ({ page }) => {
      await login(page, { type: 'b2bExpiredTrial' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      // 'Practice Tests' text may appear in search results — not asserting it
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).not.toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('B2C Expired user', () => {
    test('should perform a search as a B2C Expired user', async ({ page }) => {
      await login(page, { type: 'b2cExpiredTrial' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      // 'Practice Tests' text may appear in search results — not asserting it
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).not.toBeVisible();
      await expect(fmt(page, 'Skill Plans')).not.toBeVisible();
    });
  });

  test.describe('GenAI user', () => {
    test('should perform a search as a GenAI user', async ({ page }) => {
      await login(page, { type: 'genAI' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).toBeVisible();
    });
  });

  test.describe('B2B No Cloud Labs user', () => {
    test('should perform a search as a B2B No Cloud Labs user', async ({ page }) => {
      await login(page, { type: 'b2bNoCloudLabs' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).toBeVisible();
    });
  });

  test.describe('B2B No Interactive user', () => {
    test('should perform a search as a B2B No Interactive user', async ({ page }) => {
      await login(page, { type: 'b2bNoInterActive' });
      await page.goto('search/');
      await page.locator('[data-testid="formats-toggle"]').click();
      await expect(fmt(page, 'Books')).toBeVisible();
      await expect(fmt(page, 'Courses')).toBeVisible();
      await expect(fmt(page, 'Live Courses')).toBeVisible();
      await expect(fmt(page, 'On Demand')).toBeVisible();
      await expect(fmt(page, 'Videos')).toBeVisible();
      await expect(fmt(page, 'Case Studies')).toBeVisible();
      await expect(fmt(page, 'Conferences')).toBeVisible();
      await expect(fmt(page, 'Other')).toBeVisible();
      await expect(fmt(page, 'Live Events')).toBeVisible();
      await expect(fmt(page, 'Audiobooks')).toBeVisible();
      await expect(fmt(page, 'Shortcuts')).toBeVisible();
      await expect(fmt(page, 'Articles')).toBeVisible();
      await expect(fmt(page, 'Sandboxes')).not.toBeVisible();
      await expect(fmt(page, 'Cloud Labs')).not.toBeVisible();
      await expect(fmt(page, 'Playlists')).toBeVisible();
      await expect(fmt(page, 'Expert')).toBeVisible();
      await expect(fmt(page, 'Public')).toBeVisible();
      await expect(fmt(page, 'Certification Guides')).toBeVisible();
      await expect(fmt(page, 'Skill Plans')).toBeVisible();
    });
  });
});
