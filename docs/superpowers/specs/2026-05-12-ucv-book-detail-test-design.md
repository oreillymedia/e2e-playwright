# UCV Book Detail — Playwright Test Design

**Date:** 2026-05-12
**Location:** `tests/UCV-Books/book_detail.spec.js`
**Target URL:** `/library/view/learning-api-styles/9781098153984/` (resolved against `baseURL` in `playwright.config.js`, defaulting to `https://learning.oreilly.review/`)

## Goal

Add automated coverage for the UCV Book Detail page on the review (QA) environment as a B2B user. The page currently has no dedicated spec; it is only referenced indirectly by `tests/navigation.spec.js` via `fixtures/siteUrls.json` (ID 33).

## Scope

The test file contains a single `test.describe('UCV Book Detail')` block with one shared logged-in page (`beforeAll` / `afterAll`), and two `test()` cases:

1. **`should display book metadata`** — asserts the book title, author links, cover image, and the primary CTA (`Start`) are visible.
2. **`should open and close the table of contents`** — clicks the TOC toggle to open the panel, asserts a chapter link becomes visible; clicks the close button, asserts the chapter link is hidden and the "Table of contents collapsed" status appears.

**Scope change (2026-05-12):** The plan originally included a chapter expand/collapse test and a TOC pin/unpin test, derived from the description on `fixtures/siteUrls.json` ID 33. Live exploration of the page showed neither feature exists in the current build: this book's TOC is a flat list of chapter links (no nested rows), and no pin control is present in the DOM. Coverage has been reduced to what the page actually does.

## Non-goals

- Mobile / small-viewport variants (matches existing book detail expectations, which are desktop-only).
- Reader-page interactions (covered by a separate "UCV Book Reader" surface — see siteUrls.json ID 34).
- Anonymous / paywalled view.
- Visual regression / screenshot baselines.

## Test setup

- **User:** `b2b` (`qa+b2b_cypress@oreilly.com`) — same account used by `home.spec.js`, `navigation.spec.js`, and courses tests.
- **Viewport:** `VIEWPORTS['macbook-15']` (1440×900) — same as other desktop tests.
- **Auth helper:** `helpers/auth.js#login` (existing).
- **Run mode:** `test.describe.configure({ mode: 'parallel' })` to match repo convention.
- **Lifecycle:**
  - `beforeAll`: create context, new page, set viewport, `login(page, { type: 'b2b' })`, `page.goto(<book URL>)`.
  - `afterAll`: `page.context().close()`.

## Selectors (discovered against the live page)

| Slot | Locator |
|---|---|
| Title | `getByRole('heading', { name: 'Learning API Styles', level: 2 })` |
| Author link | `getByRole('link', { name: 'Lukasz Dynowski' })` |
| Cover image | `locator('img[src*="9781098153984"]').first()` (alt is empty in the live DOM) |
| Primary CTA (start reading) | `getByRole('link', { name: 'Start', exact: true })` |
| TOC toggle | `getByTestId('table-of-contents-button')` |
| TOC chapter (visible only when TOC is open) | `getByRole('link', { name: 'Foreword' })` |
| TOC close button | `getByRole('button', { name: 'Close table of contents' })` |
| TOC closed status | `getByText('Table of contents collapsed')` (live region announced when TOC collapses) |

The TOC defaults to open at desktop width on this page, so the test must close it once in `beforeAll` (or assert close-first behavior) to test the open/close cycle deterministically.

## Files touched

- **New:** `tests/UCV-Books/book_detail.spec.js`

No changes to fixtures, helpers, or config are anticipated. If the target URL becomes worth reusing, a future change could lift it into `fixtures/siteUrls.json`, but that is out of scope here.

## Risks

- **TOC default-open state:** the TOC opens automatically on desktop. The open/close test must collapse it first before asserting that the toggle can re-open it, otherwise the open assertion would pass trivially against initial state.
- **Cover image alt is empty:** the cover must be located by `img[src*="<ISBN>"]` rather than alt text. This is documented in the selector table above.
- **Login flakiness:** the shared `login` helper occasionally races on the post-submit redirect; existing tests already tolerate this via the helper's `waitForURL`.
