# UCV Book Detail Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playwright spec at `tests/UCV-Books/book_detail.spec.js` that logs in as a B2B user and verifies the UCV Book Detail page renders metadata correctly and that the Table of Contents can be expanded/collapsed and pinned/unpinned.

**Architecture:** Single `test.describe` block with shared logged-in page in `beforeAll`/`afterAll`, three independent `test()` cases, matching the conventions of `tests/home.spec.js` and `tests/courses/ondemand_courses.spec.js`. Exact UI selectors are discovered up front using the Playwright MCP browser against the live QA page, then baked into the spec.

**Tech Stack:** Playwright `@playwright/test` (already in `package.json`), existing `helpers/auth.js` login helper, existing `fixtures/login.js` user table, existing `VIEWPORTS` map. Repo is not a git repository — skip commit steps.

**Spec reference:** `docs/superpowers/specs/2026-05-12-ucv-book-detail-test-design.md`

**Target URL:** `https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/`

---

### Task 1: Discover selectors against the live page

**Files:**
- No code changes. Output: an updated "Selector Reference" appendix at the bottom of this plan, filled in with real selectors before subsequent tasks proceed.

**Why this task exists:** The site has no `data-testid` registry surfaced in the existing tests; selectors must be derived from live page structure. Doing it once, up front, keeps Tasks 2–5 deterministic.

- [ ] **Step 1: Launch the MCP browser and navigate to the login page**

Run via the Playwright MCP tool:
```
mcp__playwright__browser_navigate → url: "https://learning.oreilly.review/"
```

Expected: page loads the O'Reilly sign-in screen.

- [ ] **Step 2: Log in as the b2b user**

Credentials from `fixtures/login.js`:
- email: `qa+b2b_cypress@oreilly.com`
- password: `Test1234`

Use `mcp__playwright__browser_fill_form` or sequential `browser_click` + `browser_type`:
1. Type email into `input[name="email"]`, click `button[data-testid="EmailSubmit"]`.
2. Type password into `input[name="password"]`, press Enter.

Expected: redirects off `www.oreilly.com` to a `learning.oreilly.review` URL.

- [ ] **Step 3: Navigate to the book detail page and snapshot it**

```
mcp__playwright__browser_navigate → url: "https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/"
mcp__playwright__browser_snapshot
```

Expected: an accessibility tree containing the book title "Learning API Styles", an author/publisher line, a cover image, and a primary CTA (likely "Start reading" or "Continue reading").

- [ ] **Step 4: Open the TOC and snapshot**

Find the Table of Contents toggle in the snapshot (likely an "TOC" or "Table of contents" button, possibly in a left rail). Click it, then snapshot again.

```
mcp__playwright__browser_click → element: "<TOC toggle>", ref: "<ref from prior snapshot>"
mcp__playwright__browser_snapshot
```

Expected: a panel listing chapters/sections, each row likely expandable (look for a chevron, "+", or `aria-expanded="false"`).

- [ ] **Step 5: Expand a chapter and snapshot**

Click the expand affordance for the first expandable chapter. Snapshot.

Expected: sub-items appear under the chapter, and the expander's `aria-expanded` flips to `"true"`.

- [ ] **Step 6: Pin the TOC and snapshot**

Locate the pin control (commonly a pin icon button in the TOC header). Click it. Click somewhere outside the TOC and snapshot.

Expected: the TOC remains visible after the outside click. The pin button's state should be visibly distinct (e.g. `aria-pressed="true"` or an alternate icon).

- [ ] **Step 7: Unpin and snapshot**

Click the pin control again. Click outside the TOC. Snapshot.

Expected: the TOC closes/collapses on the outside click.

- [ ] **Step 8: Fill in the Selector Reference appendix**

Update the appendix at the bottom of this plan with the real selectors and assertion strategies you observed. Use role-based selectors when stable (`getByRole`, `getByText`); use `data-testid` if present; fall back to a narrowly scoped CSS selector only when nothing else is stable.

The appendix has named slots: `TITLE`, `AUTHOR`, `COVER`, `CTA`, `TOC_TOGGLE`, `TOC_PANEL`, `CHAPTER_EXPANDER`, `CHAPTER_SUBITEM`, `PIN_BUTTON`, `OUTSIDE_TARGET`. Tasks 3–5 reference these slot names exclusively.

---

### Task 2: Create the spec file scaffold

**Files:**
- Create: `tests/UCV-Books/book_detail.spec.js`

- [ ] **Step 1: Write the scaffold**

```javascript
const { test, expect } = require('@playwright/test');
const { login, VIEWPORTS } = require('../../helpers/auth');

const BOOK_URL = 'https://learning.oreilly.review/library/view/learning-api-styles/9781098153984/';

test.describe('UCV Book Detail', () => {
  test.describe.configure({ mode: 'parallel' });
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.setViewportSize(VIEWPORTS['macbook-15']);
    await login(page, { type: 'b2b' });
    await page.goto(BOOK_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await page.context().close();
  });
});
```

- [ ] **Step 2: Confirm the scaffold compiles and runs**

Run:
```bash
npx playwright test tests/UCV-Books/book_detail.spec.js --reporter=list
```

Expected: Playwright reports `0 tests` (no `test()` cases yet), exits 0. If it errors on imports or login, fix before continuing.

---

### Task 3: Implement and verify the metadata test

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js` — add one `test()` block inside the `describe`, after `afterAll`.

- [ ] **Step 1: Add the test using the selectors from the appendix**

Insert immediately before the closing `})` of `test.describe`:

```javascript
  test('should display book metadata', async () => {
    await expect(page.<TITLE>).toBeVisible();
    await expect(page.<AUTHOR>).toBeVisible();
    await expect(page.<COVER>).toBeVisible();
    await expect(page.<CTA>).toBeVisible();
  });
```

Replace each `<SLOT>` token with the concrete Playwright locator expression from the Selector Reference appendix (e.g. `getByRole('heading', { name: /Learning API Styles/i })`).

- [ ] **Step 2: Run only this test**

```bash
npx playwright test tests/UCV-Books/book_detail.spec.js -g "should display book metadata" --reporter=list
```

Expected: 1 passed.

If it fails, do not loosen the assertion to make it pass — re-check the selector against the snapshot from Task 1.

---

### Task 4: Implement and verify the TOC expand/collapse test

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

- [ ] **Step 1: Add the test**

Insert after the metadata test, inside the `describe`:

```javascript
  test('should expand and collapse the table of contents', async () => {
    await page.<TOC_TOGGLE>.click();
    await expect(page.<TOC_PANEL>).toBeVisible();

    const expander = page.<CHAPTER_EXPANDER>;
    await expander.click();
    await expect(page.<CHAPTER_SUBITEM>).toBeVisible();

    await expander.click();
    await expect(page.<CHAPTER_SUBITEM>).toBeHidden();
  });
```

If the TOC panel's open/closed state is communicated via an attribute (e.g. `aria-expanded`) rather than visibility, swap the `toBeVisible` / `toBeHidden` assertions for:
```javascript
await expect(expander).toHaveAttribute('aria-expanded', 'true');
// ...
await expect(expander).toHaveAttribute('aria-expanded', 'false');
```
The appendix from Task 1 records which signal is reliable for this site.

- [ ] **Step 2: Run only this test**

```bash
npx playwright test tests/UCV-Books/book_detail.spec.js -g "expand and collapse" --reporter=list
```

Expected: 1 passed.

Note: this test mutates page state (TOC may be left open). The next test does not assume the TOC is closed at start — it asserts behavior independent of starting state, but if needed add `await page.reload(); await page.waitForLoadState('domcontentloaded');` at the top of the pin/unpin test in Task 5.

---

### Task 5: Implement and verify the TOC pin/unpin test

**Files:**
- Modify: `tests/UCV-Books/book_detail.spec.js`

- [ ] **Step 1: Add the test**

Insert after the expand/collapse test, inside the `describe`:

```javascript
  test('should pin and unpin the table of contents', async () => {
    await page.<TOC_TOGGLE>.click();
    await expect(page.<TOC_PANEL>).toBeVisible();

    await page.<PIN_BUTTON>.click();
    await page.<OUTSIDE_TARGET>.click();
    await expect(page.<TOC_PANEL>).toBeVisible();

    await page.<PIN_BUTTON>.click();
    await page.<OUTSIDE_TARGET>.click();
    await expect(page.<TOC_PANEL>).toBeHidden();
  });
```

If pin state is communicated via `aria-pressed`, also assert:
```javascript
await expect(page.<PIN_BUTTON>).toHaveAttribute('aria-pressed', 'true');
// ... later ...
await expect(page.<PIN_BUTTON>).toHaveAttribute('aria-pressed', 'false');
```

- [ ] **Step 2: Run only this test**

```bash
npx playwright test tests/UCV-Books/book_detail.spec.js -g "pin and unpin" --reporter=list
```

Expected: 1 passed.

---

### Task 6: Run the full spec end-to-end

**Files:** none.

- [ ] **Step 1: Run all three tests in sequence**

```bash
npx playwright test tests/UCV-Books/book_detail.spec.js --reporter=list
```

Expected: `3 passed`.

- [ ] **Step 2: Run from a clean install confirmation**

```bash
npx playwright test tests/UCV-Books/ --reporter=list
```

Expected: 3 passed, exits 0. This is the assertion that will be quoted when reporting completion — do not skip it.

- [ ] **Step 3: Report**

Summarize: file path created, test count, pass/fail, anything notable (e.g. selectors that had to be brittle). Do not claim done without the output of Step 2 in hand.

---

## Selector Reference (filled in during Task 1)

> Replace each value with the Playwright locator expression (the part that follows `page.`). Example: `getByRole('heading', { name: /Learning API Styles/i })`.

| Slot | Locator | Notes |
|---|---|---|
| `<TITLE>` | _to be filled_ | Book title heading |
| `<AUTHOR>` | _to be filled_ | Author or "By X" line |
| `<COVER>` | _to be filled_ | Cover image (`<img>` with alt containing title) |
| `<CTA>` | _to be filled_ | "Start reading" / "Continue reading" button |
| `<TOC_TOGGLE>` | _to be filled_ | Button that opens the TOC panel |
| `<TOC_PANEL>` | _to be filled_ | The TOC container itself |
| `<CHAPTER_EXPANDER>` | _to be filled_ | Affordance on a chapter row that reveals its sub-items |
| `<CHAPTER_SUBITEM>` | _to be filled_ | A sub-item that should be visible only when its parent is expanded |
| `<PIN_BUTTON>` | _to be filled_ | The TOC pin/unpin control |
| `<OUTSIDE_TARGET>` | _to be filled_ | A stable element outside the TOC safe to click on |

**State signal notes:**
- TOC expand/collapse uses _visibility_ / _`aria-expanded` attribute_ (circle one during Task 1).
- TOC pin/unpin uses _visibility persistence_ / _`aria-pressed` attribute_ / _icon swap_ (circle one).
