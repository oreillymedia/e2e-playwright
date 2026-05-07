const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../../helpers/auth');

// NOTE: The nav menu uses lowercase text (e.g. "Expert playlists") while the page
// content uses title case ("Expert Playlists"). Using exact: true ensures we target
// only the visible content-area elements, not hidden nav items.

/** Delete all playlists via force-dispatch on hidden deleteButton, then confirm. */
async function deleteAllPlaylists(page) {
  let count = await page.locator('[data-testid="deleteButton"]').count();
  while (count > 0) {
    await page.locator('[data-testid="deleteButton"]').first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.getByText('Delete Playlist', { exact: true }).first().click();
    await page.waitForTimeout(800);
    count = await page.locator('[data-testid="deleteButton"]').count();
  }
}

test.describe('Playlists', () => {
  test.describe.configure({ mode: 'parallel' });
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize(VIEWPORTS['macbook-15']);
  });

  test('log in as a B2B User and create a Playlist', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.locator('input[name="email"]').fill('qa+b2b_cypress@oreilly.com');
    await page.getByText('Continue', { exact: true }).first().click();
    await page.locator('input[name="password"]').fill('Test1234');
    await page.locator('[data-testid="SignInBtn"]').click();
    await page.waitForLoadState('networkidle');
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Shared Playlists', { exact: true })).toBeVisible();
    await expect(page.getByText('Expert Playlists', { exact: true })).toBeVisible();
    await page.getByText('Your Playlists', { exact: true }).click();
    await deleteAllPlaylists(page);
    await page.locator('[data-testid="publicCreateButton"]').first().click();
    await page.locator('.MuiInputBase-root input[type="text"]').first().pressSequentially('My Cypress B2B Playlist Title');
    await page.locator('[data-testid="playlist-description"] textarea').first().fill('My Cypress B2B Playlist Description');
    await page.locator('[data-testid="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.goto('https://learning.oreilly.review/videos/-/9780135917411/');
    await page.waitForLoadState('networkidle');
    await page.getByText('Add to playlist').first().click();
    await page.getByText('My Cypress B2B Playlist Title').first().click({ force: true });
    await page.getByText('Done').first().click();
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="menuButton"] > [data-testid="icon"] > .orm-Icon-icon').first().click({ force: true });
    await page.waitForTimeout(500);
    await page.getByText('Share Settings').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="sharing-option-enterprise"]').click({ force: true });
    await page.locator('[data-testid="sharing-modal-close"]').click();
    await page.locator('[data-testid="deleteButton"]').first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.getByText('Delete Playlist', { exact: true }).first().click();
    await expect(page.getByText('Welcome to Your Playlists Page').first()).toBeVisible();
  });

  test('log in as a B2C User and create a Playlist', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.locator('input[name="email"]').fill('qa+b2c-playlist@oreillynet.com');
    await page.getByText('Continue', { exact: true }).first().click();
    await page.locator('input[name="password"]').fill('Testing12345');
    await page.locator('[data-testid="SignInBtn"]').click();
    await page.waitForLoadState('networkidle');
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Expert Playlists', { exact: true })).toBeVisible();
    await page.getByText('Your Playlists', { exact: true }).click();
    await deleteAllPlaylists(page);
    await page.locator('[data-testid="publicCreateButton"]').first().click();
    await page.locator('.MuiInputBase-root input[type="text"]').first().pressSequentially('My Cypress B2C Playlist Title');
    await page.locator('[data-testid="playlist-description"] textarea').first().fill('My Cypress B2C Playlist Description');
    await page.locator('[data-testid="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="menuButton"] > [data-testid="icon"] > .orm-Icon-icon').first().click({ force: true });
    await page.waitForTimeout(500);
    await page.getByText('Share Settings').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="sharing-option-public"]').click({ force: true });
    await page.locator('[data-testid="sharing-modal-close"]').click();
    await page.locator('[data-testid="deleteButton"]').first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.getByText('Delete Playlist', { exact: true }).first().click();
    await expect(page.getByText('Welcome to Your Playlists Page').first()).toBeVisible();
  });

  test('log in as a ProQuest User and create a Playlist', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.locator('input[name="email"]').fill('qa+academin_cypress@safaridemo.edu');
    await page.getByText('Continue', { exact: true }).first().click();
    await page.locator('input[name="password"]').fill('Test1234');
    await page.locator('[data-testid="SignInBtn"]').click();
    await page.waitForLoadState('networkidle');
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Shared Playlists', { exact: true })).toBeVisible();
    await expect(page.getByText('Expert Playlists', { exact: true })).toBeVisible();
    await page.getByText('Your Playlists', { exact: true }).click();
    await deleteAllPlaylists(page);
    await page.locator('[data-testid="publicCreateButton"]').first().click();
    await page.locator('.MuiInputBase-root input[type="text"]').first().pressSequentially('My Cypress Playlist Name');
    await page.locator('[data-testid="playlist-description"] textarea').first().fill('My Cypress Playlist Description');
    await page.locator('[data-testid="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="menuButton"] > [data-testid="icon"] > .orm-Icon-icon').first().click({ force: true });
    await page.waitForTimeout(500);
    await page.getByText('Share Settings').first().click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="sharing-option-enterprise"]').click({ force: true });
    await page.locator('[data-testid="sharing-modal-close"]').click();
    await page.locator('[data-testid="deleteButton"]').first().dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.getByText('Delete Playlist', { exact: true }).first().click();
    await expect(page.getByText('Welcome to Your Playlists Page').first()).toBeVisible();
  });

  test('log in as an expired B2C User and attempt to create a Playlist', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.locator('input[name="email"]').fill('qa+b2c_expired@oreilly.com');
    await page.getByText('Continue', { exact: true }).first().click();
    await page.locator('input[name="password"]').fill('Test1234');
    await page.locator('[data-testid="SignInBtn"]').click();
    await expect(page.getByText('Expert Playlists', { exact: true })).toBeVisible();
    await expect(page.getByText('Your Organization', { exact: true })).not.toBeVisible();
    // NOTE: "Your Playlists" tab is not rendered for expired users on the current site.
    // The page shows only "Expert Playlists" + a generic "Welcome to Your Playlists Page" message.
    await expect(page.getByText('Create Playlist', { exact: true })).not.toBeVisible();
    await expect(page.locator('._btnBackground_16994_33 > [data-testid="publicCreateButton"]')).not.toBeVisible();
  });

  test('log in as an expired B2B User and attempt to create a Playlist', async ({ page }) => {
    await page.goto('https://learning.oreilly.review/playlists/');
    await page.locator('input[name="email"]').fill('qa+b2b_expired@oreilly.com');
    await page.getByText('Continue', { exact: true }).first().click();
    await page.locator('input[name="password"]').fill('Test1234');
    await page.locator('[data-testid="SignInBtn"]').click();
    await expect(page.getByText('Expert Playlists', { exact: true })).toBeVisible();
    await expect(page.getByText('Your Organization', { exact: true })).not.toBeVisible();
    // NOTE: "Your Playlists" tab is not rendered for expired users on the current site.
    await expect(page.getByText('Create Playlist', { exact: true })).not.toBeVisible();
    await expect(page.locator('._btnBackground_16994_33 > [data-testid="publicCreateButton"]')).not.toBeVisible();
  });
});
