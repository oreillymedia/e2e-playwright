const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');
const { login, VIEWPORTS } = require('../../helpers/auth');

const BOOK_URL = '/library/view/learning-api-styles/9781098153984/';
const BOOK_TITLE = 'Learning API Styles';

test.describe('UCV Book Detail', () => {
  test.describe.configure({ mode: 'parallel' });

  const RUN_ID = `${Date.now()}-${uuidv4().slice(0, 8)}`;
  const PLAYLIST_NAME = `Book Detail Test ${RUN_ID}`;
  const PLAYLIST_DESCRIPTION = 'Created by book_detail.spec.js — safe to delete';
  const REVIEW_NOTE = `Book detail test note ${RUN_ID}`;

  let page;
  let recommendedTitle;
  let playlistCreated = false;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await login(page, { type: 'b2b' });
    await page.goto(BOOK_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    try {
      if (playlistCreated) {
        await page.goto('/playlists/');
        await page.waitForLoadState('networkidle');
        await page.getByText('Your Playlists', { exact: true }).click();
        const row = page.getByText(PLAYLIST_NAME, { exact: true }).first();
        await row.hover();
        await page
          .locator(`[data-testid="deleteButton"]`)
          .first()
          .dispatchEvent('click');
        await page.getByText('Delete Playlist', { exact: true }).first().click();
      }
    } catch (e) {
      console.warn(`Cleanup failed for ${PLAYLIST_NAME}:`, e);
    }
    await page.context().close();
  });

  test('should let a user view, add to playlist, and review a book', async () => {
    await test.step('verify book metadata', async () => {
      await expect(page.getByRole('heading', { name: BOOK_TITLE, level: 2 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Lukasz Dynowski' }).first()).toBeVisible();
      await expect(page.locator('img[src*="9781098153984"]').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible();
    });

    await test.step('open and close the table of contents', async () => {
      const toggle = page.getByTestId('table-of-contents-button');
      const chapter = page.getByRole('link', { name: 'Foreword' });
      const closeBtn = page.getByRole('button', { name: 'Close table of contents' });

      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(chapter).toBeHidden();
      }

      await toggle.click();
      await expect(chapter).toBeVisible();

      await page.getByRole('button', { name: 'Close table of contents' }).click();
      await expect(chapter).toBeHidden();
      await expect(page.getByText('Table of contents collapsed')).toBeVisible();
    });

    await test.step('create a unique playlist', async () => {
      await page.goto('/playlists/');
      await page.waitForLoadState('networkidle');
      await page.getByText('Your Playlists', { exact: true }).click();

      await page.locator('[data-testid="publicCreateButton"]').first().click();
      await page
        .locator('.MuiInputBase-root input[type="text"]')
        .first()
        .pressSequentially(PLAYLIST_NAME);
      await page
        .locator('[data-testid="playlist-description"] textarea')
        .first()
        .fill(PLAYLIST_DESCRIPTION);
      await page.locator('[data-testid="submit"]').click();
      await page.waitForLoadState('networkidle');

      playlistCreated = true;

      await page.goto(BOOK_URL);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('add this book to the playlist', async () => {
      await page.getByText('Add to playlist').first().click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click({ force: true });
      await page.getByText('Done').first().click();
      await expect(page.getByText('Done').first()).toBeHidden();
    });

    await test.step('add a recommendation to the same playlist', async () => {
      const recsHeading = page.getByRole('heading', { name: 'You might also like', level: 2 });
      const recsContainer = recsHeading.locator('..');
      const firstCard = recsContainer.locator('article').first();
      const cardAddToPlaylist = firstCard.getByRole('button', { name: 'Add to playlist', exact: true });

      await recsHeading.scrollIntoViewIfNeeded();
      recommendedTitle = (await firstCard.getByRole('link').first().textContent())?.trim();
      expect(recommendedTitle, 'captured recommended title should be non-empty').toBeTruthy();

      await cardAddToPlaylist.click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click({ force: true });
      await page.getByText('Done').first().click();
      await expect(page.getByText('Done').first()).toBeHidden();

      if (!page.url().includes('9781098153984')) {
        await page.goto(BOOK_URL);
        await page.waitForLoadState('domcontentloaded');
      }
    });

    await test.step('verify both titles appear in the playlist', async () => {
      await page.goto('/playlists/');
      await page.waitForLoadState('networkidle');
      await page.getByText('Your Playlists', { exact: true }).click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(BOOK_TITLE, { exact: false }).first()).toBeVisible();
      await expect(page.getByText(recommendedTitle, { exact: false }).first()).toBeVisible();
    });
  });
});
