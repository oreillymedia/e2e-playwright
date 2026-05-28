# UCV Reader Usage-Event Coverage Test — Overview

**File:** [`tests/Usage/b2b-ucv-reader-usage.spec.js`](../tests/Usage/b2b-ucv-reader-usage.spec.js)
**Average runtime:** ~10–12 minutes per run

Simulates a new B2B user signing up to `learning.oreilly.review` and reading several chapters. Verifies that `/api/v2/usage-event/` requests fire while reading, stop on navigate-away, stop after ~2 min idle, and resume on interaction.

## Legend

- **Bold ranges** are asserted in-test by `UsageEventTracker` ([helper](../helpers/usageEventTracker.js), [design](superpowers/specs/2026-05-27-ucv-reader-network-verification-design.md)). Counts and 2xx response status are checked per step and aggregated into one failure at run end.
- _DB-paired_ entries must be verified manually by querying the usage-event database for the test user during the named window.

## Steps

| Step | What | Expected events | Verifies |
|---|---|---|---|
| **USER CREATION** | Self-register a new B2B user (name, email, password, OTP). | 0 — registration isn't a chapter page. | A clean isolated test user. |
| **TEST 1: Chapter 1** | Scroll ch. 1 to the bottom (~60s), click "Next". | **2–6 events** (~4 expected). | Events fire during normal reading. |
| **TEST 2: Chapter 2** | Scroll ch. 2 down then up (~60s total), open TOC, click ch. 3. | **2–6 events** (~4 expected). | Events fire across mixed scroll directions. |
| **TEST 3: Chapter 3 → Home** | Read ch. 3 (~30s), click O'Reilly logo, wait 30s on home. | **1–4 events** while reading; _DB-paired: 0 events_ during the 30s home wait. | Events **stop** when leaving the reading experience. |
| **TEST 4: Chapter 4** | Scroll ch. 4 middle → top → bottom, pause 30s at bottom, click book title. | **6–14 events** (~10 expected); _DB-paired: 0 events_ after leaving the chapter. | Events fire across complex scrolling and brief on-page pauses. |
| **TEST 5: Chapter 5 idle/reactivation** | Read ch. 5 for 30s, idle 3 min, 3 page-downs, hold 45s, return home. | _DB-paired: 0 events_ during the 3-min idle (past the ~2-min threshold); **1–5 events** in the 45s post-reactivation (~3 expected). | Events **stop** after 2 min idle and **resume** on interaction — the most product-critical check. |

## Where to find the user in the DB

The test prints `[test-user] qa+b2busage-<unix-millis>@oreillynet.com` near the top of the run output. Use that email plus each step's wall-clock window to query the usage-event database for silent-window verification.
