# Book Detail Test — Playlist & Review Coverage

**Date:** 2026-05-15
**File touched:** `tests/UCV-Books/book_detail.spec.js`
**Status:** Approved, ready for implementation plan

## Goal

Extend the existing UCV Book Detail spec to cover a full user journey: view a
book, add it (and a recommended title) to a new playlist, and write a review
note. The two existing tests (`should display book metadata`, `should open and
close the table of contents`) are folded into the same journey so the spec
exercises one coherent flow rather than disconnected assertions on shared state.

## Background

`book_detail.spec.js` currently has two tests sharing a single `page` created in
`beforeAll`. Because state is already shared across tests, splitting these into
independent test cases provides little real isolation while costing readability.
Combining into one journey-style test better matches how the page is actually
used.

The "Add to playlist" flow is proven in `tests/playlists/playlist-permissions.spec.js`:
- create a playlist at `/playlists/` (`publicCreateButton`, name input, description, submit)
- on a content page, click `Add to playlist`, choose the playlist by name, click `Done`
- delete via `[data-testid="deleteButton"]` dispatch + `Delete Playlist` confirm

The review/note UI on the book detail page has no existing test coverage; its
selectors will be discovered with the Playwright Inspector during implementation.

## Test structure

Single test inside the existing `UCV Book Detail` describe:

```
test('should let a user view, add to playlist, and review a book', ...)
```

- `beforeAll`: unchanged — new context, viewport `macbook-15`, `login(page, { type: 'b2b' })`, `goto(BOOK_URL)`, `waitForLoadState('domcontentloaded')`.
- `afterAll`: delete the test playlist (guarded by a `playlistCreated` flag and wrapped in try/catch), then close the context.
- Each phase wrapped in `await test.step('<name>', async () => { ... })` so the HTML report attributes failures to the right phase.

The two existing tests are removed; their assertions move into phases 1 and 2.

## Phases

1. **Verify book metadata** — assert heading "Learning API Styles", author link "Lukasz Dynowski", cover image (`img[src*="9781098153984"]`), and "Start" link are visible.
2. **Open and close the table of contents** — if `Close table of contents` is visible (TOC opens by default at desktop width), close it first and assert `Foreword` link is hidden. Click `table-of-contents-button`, assert `Foreword` is visible. Close again; assert `Foreword` is hidden and the `Table of contents collapsed` toast appears.
3. **Create a unique playlist** — `goto('/playlists/')`, click `[data-testid="publicCreateButton"]`, type `PLAYLIST_NAME` into the first text input, fill `[data-testid="playlist-description"] textarea`, click `[data-testid="submit"]`, `waitForLoadState('networkidle')`. Set `playlistCreated = true`. `goto(BOOK_URL)` to return to the book.
4. **Add this book to the playlist** — click `Add to playlist`, click the playlist by `PLAYLIST_NAME`, click `Done`. Assert success (modal closes or confirmation toast).
5. **Add a "You might also like" recommendation to the same playlist** — scroll to the recommendations section, capture the first recommendation's title text into `recommendedTitle`, trigger its add-to-playlist action, select `PLAYLIST_NAME`, click `Done`. If the action navigates away from the book page, `goto(BOOK_URL)` after.
6. **Verify both titles are in the playlist** — `goto('/playlists/')`, open the playlist named `PLAYLIST_NAME`, assert "Learning API Styles" is visible AND `recommendedTitle` is visible in the playlist contents.
7. **Write a unique review note** — `goto(BOOK_URL)`, open the note/review UI, type `REVIEW_NOTE`, submit, assert the note text is visible on the page.

**Cleanup (`afterAll`):** if `playlistCreated`, navigate to `/playlists/`, locate the playlist by `PLAYLIST_NAME`, dispatch the delete button click, confirm `Delete Playlist`. Wrap in try/catch and log a warning on failure so context close always runs.

## State, data, and constants

Declared at describe scope, above `beforeAll`:

```js
const RUN_ID = `${Date.now()}-${uuidv4().slice(0, 8)}`;
const PLAYLIST_NAME = `Book Detail Test ${RUN_ID}`;
const PLAYLIST_DESCRIPTION = 'Created by book_detail.spec.js — safe to delete';
const REVIEW_NOTE = `Book detail test note ${RUN_ID}`;
let recommendedTitle;
let playlistCreated = false;
```

`uuid` is already a dependency; import `{ v4 as uuidv4 }` from it.

### Data lifecycle

| Artifact            | Created  | Cleaned up                                            |
|---------------------|----------|-------------------------------------------------------|
| Playlist            | Phase 3  | `afterAll` (delete via dispatch + confirm)            |
| Review note         | Phase 7  | **Left behind** — each run writes a fresh unique note |
| Recommended title   | Phase 5  | In-memory only                                        |

Each `RUN_ID` is unique so parallel CI runs and retries do not collide on
playlist names or review note text.

## Unknowns to resolve during implementation

These will be confirmed by running the Playwright Inspector against the live
book page; the design does not depend on the answers, only on the actions:

- Whether "Add to playlist" works inline on the book page (most likely) or requires opening a side panel/modal first.
- The "You might also like" section's locator, and how its recommendation cards expose an add-to-playlist affordance (hover menu? always visible button? overflow menu?).
- The review/note UI on the book detail page: element type (textarea vs. rich text), submit/save control label, and where the saved note renders for assertion.

## Failure modes and mitigations

- **Recommendation card click navigates away:** Phase 5 explicitly checks and re-navigates to `BOOK_URL` if needed.
- **Playlist creation fails mid-test:** `playlistCreated` flag prevents `afterAll` from blindly trying to delete a non-existent playlist.
- **Context close prevented by cleanup error:** try/catch around the delete logic keeps the context.close() path live, avoiding a wedged worker.
- **Login flakiness** (observed once on retry already): unchanged — Playwright's existing retry config handles it at the test level.

## Out of scope

- Extracting playlist helpers into `helpers/` — premature for one consumer; revisit if a second spec needs them.
- Cleaning up the review note — the user chose "unique each run, leave behind".
- Coverage for star ratings or other review UI variants beyond a written note.
