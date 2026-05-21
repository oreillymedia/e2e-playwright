# Usage-Event Coverage Test — Overview

**File:** `tests/Usage/b2b-ucv-reader-usage.spec.js`
**Average runtime:** ~10-12 minutes per run

## What this test does

Simulates a brand-new business (B2B) user signing up for `learning.oreilly.review` and reading several chapters of an O'Reilly book. While they read, the platform sends `/api/v2/usage-event/` requests every ~15 seconds to track engagement. This test confirms those requests:

- **Fire** while the user is actively reading a chapter
- **Stop** when the user navigates away from the reading experience
- **Stop** after ~2 minutes of inactivity, even if the user is still on a chapter
- **Resume** as soon as the user interacts again

Each step below produces a clear timestamp window. Pair the start/end of each step with the test user's email (`qa+b2busage-<timestamp>@oreillynet.com`) to count events in the database.

## Steps

| Step | Duration | What happens | Expected events |
|---|---|---|---|
| **USER CREATION** | ~30s | Self-registers a new B2B user (name, email, password, magic OTP code). | 0 — registration is not a chapter page |
| **TEST 1: Chapter 1** | ~60s | User scrolls steadily to the bottom of Chapter 1 of *Learning API Styles*, then clicks the "Next" link at the end of the page to move to Chapter 2. | ~4 events |
| **TEST 2: Chapter 2** | ~60s | User scrolls steadily to the bottom of Chapter 2 (~30s), then scrolls back to the top (~30s), then opens the Table of Contents and clicks the TOC link for Chapter 3 to move there. | ~4 events |
| **TEST 3: Chapter 3 → Home** | ~60s | User reads Chapter 3 briefly, then clicks the O'Reilly logo to return to the home page and waits 30 seconds. | ~2 events during reading, then **0 events** during the 30-second home-page window (the "silent" check) |
| **TEST 4: Chapter 4 back-and-forth** | ~2.5 min | User scrolls Chapter 4 in three passes — to the middle (30s), back to the top (30s), all the way to the bottom (60s), then pauses 30 seconds at the bottom. Finally clicks the book title to return to the book detail page. | ~10 events across the 2.5 minutes of activity, then **0** after leaving the chapter |
| **TEST 5: Idle and reactivation on Chapter 5** | ~4.5 min | User reads Chapter 5 for 30 seconds, then **idles for 3 minutes** without touching the keyboard or mouse. After the idle, the user presses page-down 3 times to wake the session and reads for another 45 seconds. Finally returns to the home page. | ~2 events during the initial reading, **0 events** during the 3-minute idle (after ~2 min mark), then ~3 events after reactivation |

## Why each step matters

- **USER CREATION** — establishes a clean, isolated user account so the events tracked in the DB can't be confused with any other user's activity.
- **TEST 1 & 2** — baseline confirmation that events fire as expected during normal reading on multiple chapters.
- **TEST 3** — confirms events **stop** when the user leaves the reading experience. The 30-second window on the home page is the easiest place in the DB to verify zero activity for that user.
- **TEST 4** — covers more complex reader behavior: scrolling around within a chapter, pausing while still on the page, and exiting via a different route (book detail page instead of home). Confirms events keep firing even during the "lingering" pause.
- **TEST 5** — covers the two-stage session lifecycle: events should stop after 2 minutes of inactivity (saving server load), and resume the moment the user comes back. This is the most product-critical check because it confirms the inactivity timeout actually works.

## Where to find the user in the DB

The test creates a one-off email per run: `qa+b2busage-<unix-millis>@oreillynet.com` where `<unix-millis>` is the timestamp when the test started. The exact email is logged at the start of each run.
