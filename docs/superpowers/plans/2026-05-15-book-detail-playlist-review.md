# Book Detail Playlist + Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two existing tests in `tests/UCV-Books/book_detail.spec.js` with one journey-style test that views a book, adds it (and a "You might also like" recommendation) to a newly-created playlist, then writes a unique review note.

**Architecture:** Single Playwright test inside the existing `UCV Book Detail` describe. Each phase wrapped in `test.step()` so the HTML report attributes failures to the right phase. `beforeAll` unchanged; `afterAll` extended with playlist deletion (guarded by `playlistCreated` flag, wrapped in try/catch). Three selectors are not known in advance — they will be discovered with Playwright's Inspector / codegen during the relevant tasks.

**Tech Stack:** Playwright 1.49 (`@playwright/test`), Node.js, `uuid` for unique run IDs.

**Spec:** `docs/superpowers/specs/2026-05-15-book-detail-playlist-review-design.md`

---

## File Structure

Only one source file is changed; no new files.

- **Modify:** `tests/UCV-Books/book_detail.spec.js` — replace its two tests with one journey-style test, extend `afterAll` with playlist cleanup, add constants and `uuid` import.

No new helpers, fixtures, or utilities are introduced (out of scope per the spec).

## Special note on TDD for this plan

Standard TDD ("write failing test → write code → green") does not map cleanly here: this plan **is** the test, and the production code already exists in the live app at `learning.oreilly.review`. The loop for each phase is:

1. Write the phase code.
2. Run only that phase's assertions against the live app.
3. If it fails because of a selector mismatch, open the Playwright Inspector / codegen against the live page, capture the correct locator, update the code.
4. Re-run; on green, commit.

Tasks below call out which phases have **known** selectors (proven by `tests/playlists/playlist-permissions.spec.js`) versus **unknown** selectors that require discovery on the live page.

---

## Task 1: Add imports, constants, and refactor describe scaffold

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

- [ ] **Step 1: Replace the file contents with the new scaffold**

Replace the entire file (we are deleting both existing tests in the same pass — their bodies will return as phases inside the new test in later tasks):

```js
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
        // Click into Your Playlists, find by name, dispatch delete, confirm.
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
    // phases added in subsequent tasks
  });
});
```

- [ ] **Step 2: Run the test to confirm scaffold compiles and passes**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium`
Expected: 1 passed (empty test body trivially passes; `beforeAll` login + navigation succeeds; `afterAll` skips deletion because `playlistCreated === false`).

- [ ] **Step 3: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): scaffold journey-style test with playlist cleanup"
```

---

## Task 2: Phase 1 — verify book metadata

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js` (inside the test body)

Selectors are **known** — copied from the existing `should display book metadata` test.

- [ ] **Step 1: Add the metadata phase inside the test body**

Replace `// phases added in subsequent tasks` with:

```js
    await test.step('verify book metadata', async () => {
      await expect(page.getByRole('heading', { name: BOOK_TITLE, level: 2 })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Lukasz Dynowski' }).first()).toBeVisible();
      await expect(page.locator('img[src*="9781098153984"]').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible();
    });
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): add metadata verification phase"
```

---

## Task 3: Phase 2 — open and close the table of contents

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

Selectors are **known** — copied from the existing `should open and close the table of contents` test.

- [ ] **Step 1: Append the TOC phase after the metadata step**

Add immediately after the `verify book metadata` step:

```js
    await test.step('open and close the table of contents', async () => {
      const toggle = page.getByTestId('table-of-contents-button');
      const chapter = page.getByRole('link', { name: 'Foreword' });
      const closeBtn = page.getByRole('button', { name: 'Close table of contents' });

      // TOC opens by default at desktop width; close first so the open assertion is meaningful.
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
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): add table of contents toggle phase"
```

---

## Task 4: Phase 3 — create a unique playlist

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

Selectors are **known** — copied from `tests/playlists/playlist-permissions.spec.js` (the `publicCreateButton` create pattern is proven).

- [ ] **Step 1: Append the playlist creation phase**

```js
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
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium`
Expected: 1 passed. After the run, `afterAll` should delete the test playlist; verify nothing named `Book Detail Test ${RUN_ID}` is left over by visiting `/playlists/` manually if you have time, or by re-running and confirming there is still only one such playlist after the next run.

- [ ] **Step 3: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): create test playlist with cleanup guard"
```

---

## Task 5: Phase 4 — add the current book to the playlist

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

The "Add to playlist" pattern is **known** from `playlist-permissions.spec.js` lines 47–49: click `Add to playlist`, click the playlist name, click `Done`. The success indicator (toast/modal-close) is **unknown** — discover during this task.

- [ ] **Step 1: Append the add-book-to-playlist phase**

```js
    await test.step('add this book to the playlist', async () => {
      await page.getByText('Add to playlist').first().click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click({ force: true });
      await page.getByText('Done').first().click();
      // Verify the dialog closed (the "Done" button should no longer be visible).
      await expect(page.getByText('Done').first()).toBeHidden();
    });
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium --headed`
Expected: 1 passed. The `--headed` run lets you visually confirm the dialog closes and the book is added.

- [ ] **Step 3: If the test fails on the `Done`/dialog-close assertion**

Open Playwright Inspector to find the real success indicator:
```bash
npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium --debug
```
Step into the "add this book to the playlist" phase, click `Add to playlist` manually, and observe what changes on the page after `Done` is clicked. Update the final assertion to match — e.g. a confirmation toast like `Added to playlist` if present.

- [ ] **Step 4: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): add current book to test playlist"
```

---

## Task 6: Phase 5 — add a "You might also like" recommendation

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

Selectors here are **unknown**. Discover them before writing the code.

- [ ] **Step 1: Discover the "You might also like" section and recommendation card affordances**

Run the Inspector against the book page:
```bash
npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium --debug
```
Step until `beforeAll` finishes and you are on the book page. In the Inspector:
1. Scroll to the "You might also like" section.
2. Click "Pick locator" and select the section heading. Record the locator.
3. Pick a recommendation card. Record its title locator (likely a link inside the card).
4. Find the add-to-playlist control on the card — hover, overflow menu, or always-visible button. Record its locator.

Write the recovered selectors at the top of the phase as `const` declarations so they're easy to find.

- [ ] **Step 2: Implement the phase using the discovered selectors**

Use this template; replace the three TODO selectors with what you recovered in Step 1. Do not leave the TODO strings in the committed code.

```js
    await test.step('add a recommendation to the same playlist', async () => {
      // Adjust these three locators based on what Inspector recovered.
      const recsSection = page.getByRole('region', { name: /you might also like/i });
      const firstCard = recsSection.locator('[data-testid="recommendation-card"]').first();
      const cardAddToPlaylist = firstCard.getByRole('button', { name: /add to playlist/i });

      await recsSection.scrollIntoViewIfNeeded();
      recommendedTitle = (await firstCard.getByRole('heading').first().textContent())?.trim();
      expect(recommendedTitle, 'captured recommended title should be non-empty').toBeTruthy();

      await cardAddToPlaylist.click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click({ force: true });
      await page.getByText('Done').first().click();
      await expect(page.getByText('Done').first()).toBeHidden();

      // If the click navigated away from the book page, return.
      if (!page.url().includes('9781098153984')) {
        await page.goto(BOOK_URL);
        await page.waitForLoadState('domcontentloaded');
      }
    });
```

- [ ] **Step 3: Run the test in headed mode**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium --headed`
Expected: 1 passed; `recommendedTitle` populated.

- [ ] **Step 4: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): add YMAL recommendation to playlist"
```

---

## Task 7: Phase 6 — verify both titles are in the playlist

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

Navigation selectors (`Your Playlists`, playlist row) are **known**. Locator for the title-list inside a playlist is **unknown** — discover.

- [ ] **Step 1: Discover the playlist contents locator**

Run with `--debug`, step into the test, then manually navigate to `/playlists/` → Your Playlists → click into the test playlist. Use Inspector to pick a locator for the title list (likely a list of links named after each title).

- [ ] **Step 2: Append the verification phase**

```js
    await test.step('verify both titles appear in the playlist', async () => {
      await page.goto('/playlists/');
      await page.waitForLoadState('networkidle');
      await page.getByText('Your Playlists', { exact: true }).click();
      await page.getByText(PLAYLIST_NAME, { exact: true }).first().click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(BOOK_TITLE, { exact: false }).first()).toBeVisible();
      await expect(page.getByText(recommendedTitle, { exact: false }).first()).toBeVisible();
    });
```

- [ ] **Step 3: Run the test**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium`
Expected: 1 passed.

- [ ] **Step 4: If assertions fail**

The likely cause is that `getByText` matches the playlist's "title" cell ambiguously (e.g. matches a navigation crumb). Refine the locator: scope to the items list, e.g. `page.locator('[data-testid="playlist-items"]').getByText(BOOK_TITLE)`. Use Inspector to identify the right wrapper.

- [ ] **Step 5: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): verify both titles in playlist"
```

---

## Task 8: Phase 7 — write a unique review note

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

Selectors are **unknown**. Discover the note/review UI on the book page.

- [ ] **Step 1: Discover the review-note UI**

Run with `--debug`, step into the test, and on the book page use Inspector to find:
1. The control that opens the note/review editor (button or always-visible textarea).
2. The text input element type (textarea vs. contenteditable rich-text).
3. The save/submit control.
4. Where the saved note renders for assertion.

- [ ] **Step 2: Append the review-note phase**

Replace the four placeholder locators with the ones you recovered. Do not commit with `TODO` strings.

```js
    await test.step('write a unique review note', async () => {
      await page.goto(BOOK_URL);
      await page.waitForLoadState('domcontentloaded');

      // Replace these four locators with the selectors recovered in Step 1.
      const openNoteEditor = page.getByRole('button', { name: /add a note|write a review/i });
      const noteField = page.getByRole('textbox', { name: /note|review/i });
      const saveNote = page.getByRole('button', { name: /save|submit/i });
      const savedNote = page.getByText(REVIEW_NOTE, { exact: false });

      await openNoteEditor.click();
      await noteField.fill(REVIEW_NOTE);
      await saveNote.click();
      await expect(savedNote).toBeVisible();
    });
```

- [ ] **Step 3: Run the test in headed mode**

Run: `npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium --headed`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add tests/UCV-Books/book_detail.spec.js
git commit -m "test(book-detail): write a unique review note"
```

---

## Task 9: Verify end-to-end stability

**Files:** none modified

- [ ] **Step 1: Run the full file twice in a row**

```bash
npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium
npx playwright test tests/UCV-Books/book_detail.spec.js --project=chromium
```
Expected: both runs pass (1 passed each time). The second run validates that `afterAll` from the first run cleaned up the playlist (otherwise the create step would collide or the verify step would see stale data).

- [ ] **Step 2: Check the report for `test.step` breakdowns**

```bash
npx playwright show-report
```
Expected: the single test in the report shows seven nested steps (verify book metadata / open and close the table of contents / create a unique playlist / add this book to the playlist / add a recommendation to the same playlist / verify both titles appear in the playlist / write a unique review note).

- [ ] **Step 3: Manual leftover check**

Log into the test account via the browser and visit `/playlists/`. Confirm there are no `Book Detail Test *` playlists remaining (other than possibly one from an in-flight run). The review note on the book page may persist — that is intentional per the spec.

- [ ] **Step 4: No code commit needed** unless Step 1 or 2 surfaces issues that require a fix. If a fix is needed, follow the same write-run-commit loop per phase.

---

## Self-review notes (already applied)

- Spec coverage: every spec phase has a task; cleanup, constants, and the `playlistCreated` guard are all implemented in Task 1.
- Placeholder scan: tasks 6 and 8 contain template locators that explicitly require Inspector discovery in their Step 1 before being committed; this is by design per the spec's "Unknowns" section, not unresolved planning.
- Type consistency: `PLAYLIST_NAME`, `REVIEW_NOTE`, `recommendedTitle`, `playlistCreated`, and `BOOK_TITLE` names are used consistently across all tasks.
