# EventHub Test Strategy

**Generated**: 2026-05-31  
**Scope**: All features — Authentication, Event Browsing, Booking Management, Admin Event Management, Sandbox Limits, Cross-User Security & Isolation  
**Sources**: 6 scenario files (252 total scenarios), domain knowledge (BusinessRules.md, API_Documentation.md, UserFlows.md), Playwright best practices

---

## 1. Test Pyramid & Goals

```
           /‾‾‾‾‾‾‾‾‾‾\
          /   E2E: 62   \      ← critical journeys, UI state, browser security
         /‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
        /  API/Integ: 78  \    ← validations, error codes, schemas, CRUD rules
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      /     Unit: 6         \  ← pure client-side functions (refund, price, ref format)
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

**Total recommended tests**: 146  
**Scenarios analyzed**: 252 (some consolidated into parameterized tests; some demoted to lower layers)

---

## 2. Distribution Table

| Layer | Count | Focus | Avg Time/Test | Total Est. Time |
|-------|-------|-------|--------------|-----------------|
| Unit | 6 | Pure client-side logic (refund eligibility, price calc, ref format) | ~5ms | <1s |
| API/Integration | 78 | Validation rules, HTTP error codes, response schemas, CRUD ops, security (401/403) | ~300ms | ~25s |
| E2E (Playwright) | 62 | Multi-page journeys, UI state, browser behavior, sandbox banners, cross-user UI flows | ~8s | ~8min |
| **Total** | **146** | | | **~8.5 min** |

---

## 3. Layer Assignments by Feature

### 3.1 Authentication (`docs/authScenarios.md`)

#### Unit Tests (2)
| ID | Scenario | Rationale |
|----|----------|-----------|
| AUTH-U-01 | Validate JWT token structure (3-part dot-separated string) | Pure string validation, no I/O needed |
| AUTH-U-02 | Password minimum length check (>= 6 chars) | Pure comparison; validates same rule at lowest layer |

#### API Tests (21)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-003 | GET /api/auth/me returns correct schema `{ user: { userId, email } }` | API contract; no UI needed |
| TC-102 | Protected endpoints (GET /api/events, GET /api/bookings) return 401 without token | HTTP code verification, not browser behavior |
| TC-106, TC-107 | Login/register response schema validation (`{ token, user: { id, email } }`) | Response structure belongs at API layer |
| TC-205 | Brute force: 10 consecutive failed logins return 401 each time | Rate-limiting/stability verification; API layer |
| TC-207 | Cross-user token isolation: User A's token → GET /api/bookings/<UserB_id> → 403 | Cross-user enforcement at API, no UI needed |
| TC-208, TC-209 | Register/Login response does NOT include password field | Response data validation; API layer |
| TC-301 | Duplicate email re-registration returns HTTP 409 | Error code verification |
| TC-305 | GET /api/auth/me without token → 401 | Negative API test |
| TC-306 | Email case sensitivity behavior documented (login with uppercase email) | API contract behavior |
| TC-308 | Special characters in password — exact match required (401 on wrong variant) | Credential matching; API |
| TC-309 | Reuse of logged-out token: document API behavior | Stateless JWT behavior; API |
| TC-402, TC-403 | Long email (255 chars) / long password (1000 chars) — no 500 | Boundary robustness; API |
| TC-404 | Email with subdomains/plus-addressing — consistent behavior | Email format edge case; API |
| TC-405 | Concurrent duplicate registration (race condition) — only one 201 | Atomicity; API |
| TC-406 | Whitespace-only password rejected | Input sanitization; API |
| TC-407 | Login with leading/trailing whitespace in email — document behavior | Trimming behavior; API |
| TC-100 (API half) | Short password (5 chars) → 400 validation error | Core validation rule; fastest at API |
| TC-101 (API half) | Duplicate email → 409 | Already listed above |
| TC-103 (API half) | Wrong password → HTTP 401 `"Invalid credentials"` | Error code; API |

#### E2E Tests (26)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | Register new user → JWT stored → home redirect | P0 SMOKE | Full stack journey with browser state |
| TC-002 | Login with valid credentials → home redirect | P0 SMOKE | Auth flow must work in browser |
| TC-004 | Page reload retains auth (JWT survives localStorage reload) | P1 SANITY | Browser localStorage behavior |
| TC-005 | Logout → protected routes redirect to /login | P1 SANITY | Client-side session teardown |
| TC-006 | Register then immediately login with same credentials | P1 REGRESSION | End-to-end account lifecycle |
| TC-100 (E2E half) | 5-char password → inline UI error message shown | P0 REGRESSION | User-visible error display (1 E2E only; API tests the rule) |
| TC-101 (E2E half) | Duplicate email → error message on registration form | P0 REGRESSION | UI error display |
| TC-103 (E2E half) | Wrong password → "Invalid credentials" shown in UI | P0 REGRESSION | UI error display |
| TC-200 | Navigate to /events, /bookings, /admin/events unauthenticated → redirect to /login | P0 REGRESSION | Browser route-guard behavior |
| TC-201 (E2E half) | Tampered JWT in localStorage → UI redirects to login | P0 REGRESSION | Client-side session invalidation behavior |
| TC-202 | SQL injection in login email → rejected, no bypass | P0 REGRESSION | Browser-level safety check |
| TC-204 | XSS payload in email field → no script executes | P1 REGRESSION | Must verify in live browser; can't test script execution at API |
| TC-206 | JWT NOT present in URL after login (browser address bar check) | P1 REGRESSION | URL inspection requires browser |
| TC-302 | Empty login form → inline validation UI errors | P1 REGRESSION | Client-side HTML validation behavior |
| TC-303 | Empty registration form → inline validation UI errors | P1 REGRESSION | Client-side validation |
| TC-307 (E2E half) | Invalid email format → validation error UI | P1 REGRESSION | UI-side validation display |
| TC-400 | Exactly 6-char password → registration succeeds (boundary) | P1 REGRESSION | Verifies both API + UI positive path at boundary |
| TC-401 | Exactly 5-char password → rejected (boundary) | P1 REGRESSION | Boundary E2E confirms UI behavior matches API |
| TC-500 | Empty form submission → inline errors below fields, no navigation | P1 REGRESSION | UI state behavior |
| TC-501 | Failed login → error message displayed, user stays on /login | P0 SMOKE | Core UI error feedback |
| TC-502 | Throttled network → submit button shows loading indicator | P2 REGRESSION | Loading state prevents double-submit |
| TC-503 | Navigate to /bookings while logged out → login → redirected back to /bookings | P1 REGRESSION | Post-login redirect intent |
| TC-504 | Navigate to /login while already logged in → redirect away | P2 REGRESSION | Auth guard for already-authenticated users |
| TC-505 | Navigate to /register while logged in → redirect away | P2 REGRESSION | Consistent auth guard |
| TC-506 | Password visibility toggle works | P2 REGRESSION | UI component behavior |

---

### 3.2 Event Browsing (`docs/eventsScenarios.md`)

#### API Tests (8)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-106 | GET /api/events without token → 401 | Authorization enforcement |
| TC-107 | GET /api/events?page=1&limit=9 returns `{ data, pagination }` schema | Response schema contract |
| TC-201 | GET /api/events and GET /api/events/:id without token → 401 | Security: both list and detail endpoints |
| TC-203 | GET /api/events/<UserA_event_id> using User B's token → 403/404 | Sandbox isolation at API |
| TC-304 | GET /api/events?search=';DROP TABLE events;-- → 200 or 400, no 500 | SQL injection via query param |
| TC-305 | GET /api/events?page=9999 → empty array, no 500 | Pagination OOB handling |
| TC-306 | GET /api/events?limit=-5 → 400 or safe default | Negative limit validation |
| TC-403 | GET /api/events?search=<500-char string> → no 500 | Input length robustness |

#### E2E Tests (32)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | Authenticated user sees at least 10 static events on /events | P0 SMOKE | Core browse feature |
| TC-002 | Search "Tech" → only matching events shown | P0 SMOKE | Search is primary browse feature |
| TC-003 | Search by description keyword → results shown | P1 SANITY | Search scope coverage |
| TC-004 | Category filter "Conference" → only conferences shown | P0 SMOKE | Filter feature |
| TC-005 | City filter "Bangalore" → only Bangalore events | P0 SMOKE | Filter feature |
| TC-006 | Combined category + search filter → correct intersection | P1 REGRESSION | Multi-filter logic |
| TC-007 | Click "Book Now" → navigates to /events/:id with all details visible | P0 SMOKE | Navigation to booking flow |
| TC-100 | Events page shows max 9 per page | P1 REGRESSION | Pagination limit (BR §3) |
| TC-101 | Pagination: Next button shows page 2, no duplicates | P1 REGRESSION | Pagination navigation |
| TC-102 | Static events visible for both User A and User B | P1 REGRESSION | Shared static data |
| TC-103 | User A's dynamic event NOT visible to User B | P0 REGRESSION | Sandbox isolation (BR §2) |
| TC-104 (E2E half) | Static event "IPL Cricket Finals" shows 40,000 seats | P1 SANITY | Fixed DB field verified in UI |
| TC-105 | Create event (100 seats), book 10 → event detail shows 90 seats | P1 REGRESSION | Dynamic seat computation (BR §6) |
| TC-200 | Unauthenticated navigate to /events → redirect to /login | P0 REGRESSION | Route protection |
| TC-202 | XSS in search bar → no script executes | P1 REGRESSION | Must verify in browser |
| TC-204 | Navigate to /events/99999999 → 404/error page, no crash | P1 REGRESSION | Browser error handling |
| TC-300 | Search "zzznomatchxxx" → empty state "No events found" | P1 REGRESSION | Empty state UI |
| TC-301 | Category filter with no events → empty state | P1 REGRESSION | Empty state UI |
| TC-302 (E2E half) | Navigate to /events/<invalid_uuid> → event not found shown in UI | P1 REGRESSION | UI error handling |
| TC-303 | Search with whitespace → all events or empty (document behavior) | P2 REGRESSION | Input edge case |
| TC-400 | Search "tech conference" (lowercase) → "Tech Conference Bangalore" found | P1 REGRESSION | Case-insensitive search |
| TC-401 | Clear search and filters → all events restore | P1 REGRESSION | Filter reset state |
| TC-402 | Event with 0 seats shows on list; "Book Now" shows 0 or insufficient seats | P1 REGRESSION | Sold-out event display |
| TC-404 | Sports + Mumbai filter combo → empty state | P2 REGRESSION | Combined filter edge |
| TC-405 | Rapidly switching category filters → final selection is correct, no stale results | P2 REGRESSION | Race condition in filter state |
| TC-406 | Create event in admin → immediately searchable on /events | P1 REGRESSION | Data freshness |
| TC-500 | Throttled network → loading spinner/skeleton shown on /events | P2 REGRESSION | Loading UI state |
| TC-501 | Empty search state → "No events found" + pagination hidden | P1 REGRESSION | Empty state with pagination |
| TC-502 | Event card shows all required fields (title, category, city, venue, date, price, seats) | P1 SANITY | Card completeness |
| TC-503 | Pagination controls hidden when ≤ 9 events | P1 REGRESSION | Conditional pagination |
| TC-504 | Search bar + dropdowns visible and functional on page load | P1 SANITY | Filter controls present |
| TC-505 | Event detail page shows all info + booking form | P1 SANITY | Detail page completeness |

---

### 3.3 Booking Management (`docs/bookingScenarios.md`)

#### Unit Tests (2)
| ID | Scenario | Rationale |
|----|----------|-----------|
| BOOK-U-01 | Refund eligibility: qty === 1 → eligible; qty > 1 → not eligible | Pure client-side logic (BR §8); no API call made — must be unit tested |
| BOOK-U-02 | Price calculation: totalPrice = price × quantity | Pure arithmetic function (BR §9); unit test catches floating-point issues |

#### API Tests (13)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-009 | GET /api/bookings/ref/:ref → 200 with full booking object | API contract for reference lookup |
| TC-107 | DELETE /api/bookings/:id → available seats restored immediately (verify via GET /api/events/:id) | Seat restoration logic verified at API |
| TC-111 | Booking references for 3 events each match regex `^[A-Z]-[A-Z0-9]{6}$` | Format contract; fastest at API |
| TC-202 | DELETE /api/bookings/<UserA_id> using User B's token → 403 | Cross-user write protection |
| TC-203 | POST/GET/DELETE /api/bookings without token → 401 | Auth enforcement on all methods |
| TC-204 | DELETE /api/bookings (clear all) scoped to authenticated user; User B unaffected | Scoping of bulk delete |
| TC-205 | GET /api/bookings/ref/<UserA_ref> with User B's token → 403/404 | Reference lookup isolation |
| TC-304 | GET /api/bookings/<invalid_uuid> → 404/403 | Invalid resource handling |
| TC-305 | GET /api/bookings/ref/INVALID-REF → 404 | Invalid format handling |
| TC-306 | DELETE already-deleted booking → 404, no crash | Idempotent delete behavior |
| TC-402 | Two bookings for same event have different 6-char random portions | Reference uniqueness |
| TC-405 | Concurrent booking for event with 1 seat: only one succeeds, no negative seats | Race condition; API-level concurrency |
| TC-406 | DELETE /api/bookings (clear all) → verify seats restored for all 3 events via API | Bulk delete + seat restore |

#### E2E Tests (36)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | Book 1 ticket for "Tech Conference" → ref starts with "T", price = $1499 | P0 SMOKE | Core booking flow with BR §7 validation |
| TC-002 | Book 3 tickets for "Bollywood Night" → ref starts with "B", price = $2997 | P0 SMOKE | Multi-ticket booking + price calc visible in UI |
| TC-003 | Navigate to /bookings → all bookings listed with details | P0 SMOKE | Booking list view |
| TC-004 | Click "View Details" → /bookings/:id shows full info + refund button + cancel | P0 SMOKE | Booking detail page |
| TC-005 | Cancel a booking → removed from list + seats freed (visible on event page) | P0 SMOKE | Cancellation flow |
| TC-006 | Clear all bookings → empty state shown | P1 SANITY | Bulk cancellation |
| TC-007 | Refund check for qty=1 → 4s spinner → "Single-ticket bookings qualify for a full refund" | P1 SANITY | Client-side refund logic + spinner (BR §8) |
| TC-008 | Post-booking → click "View My Bookings" → new booking in list | P1 SANITY | Post-booking navigation |
| TC-100 | "Tech Conference" booking ref starts with "T" format T-XXXXXX | P0 REGRESSION | Critical BR §7 first-char rule |
| TC-101 | Book B/A/M/H events → each ref starts with correct first letter | P0 REGRESSION | BR §7 across multiple events |
| TC-102 | 5 tickets for IPL ($2499) → total $12,495 confirmed in UI | P0 REGRESSION | Price calculation (BR §9) |
| TC-103 | "Photography Workshop" 50 seats → book 3 → shows 47 | P0 REGRESSION | Immediate seat reduction (BR §6) |
| TC-104 | User has 8 bookings → 9th booking created successfully | P1 REGRESSION | Boundary below FIFO |
| TC-105 | User has 9 bookings → 10th created → oldest pruned, 9 remain | P0 REGRESSION | FIFO prune (BR §4) |
| TC-106 | Navigate to /bookings with 9 bookings → max 9 cards visible | P1 REGRESSION | Display limit |
| TC-108 | Booking qty=3 → refund check → "Group bookings (3 tickets) are non-refundable" | P0 REGRESSION | Multi-ticket non-refund (BR §8) |
| TC-109 | Refund check → spinner lasts ~4 seconds → result only after | P1 REGRESSION | Timing behavior (BR §8) |
| TC-110 | Same dynamic event booked twice → both succeed, seats deducted correctly | P1 REGRESSION | Repeat booking allowed (BR §6) |
| TC-200 | Unauthenticated /bookings → redirect to /login | P0 REGRESSION | Route protection |
| TC-201 (E2E half) | Navigate to /bookings/<UserA_id> as User B → "Access Denied" shown | P0 REGRESSION | UI display of 403 (Flow 6) |
| TC-300 (E2E half) | Book event with only 2 seats, qty=5 → "Insufficient seats available" error in UI | P0 REGRESSION | Error display for 400 |
| TC-301 | Quantity "−" button disabled at 1 (cannot set qty=0) | P1 REGRESSION | UI guard; also API if button can be bypassed |
| TC-302 | Booking form: submit without customer name → validation error | P1 REGRESSION | Required field UI validation |
| TC-303 | Booking form: invalid email format → validation error | P1 REGRESSION | Email format UI validation |
| TC-307 | Booking form: all fields empty → validation errors for name/email/phone | P1 REGRESSION | Multi-field validation state |
| TC-308 | /bookings with no bookings → "No bookings found" empty state | P1 REGRESSION | Empty state |
| TC-400 | Quantity "+" caps at 10; booking with qty=10 succeeds | P1 REGRESSION | Max quantity boundary |
| TC-401 | Event with 1 seat: book 1 → shows 0; second booking → insufficient seats | P1 REGRESSION | Boundary seat depletion |
| TC-403 | Book "AI Summit" ($1999) × 10 → total $19,990 shown correctly | P2 REGRESSION | Max quantity price calc |
| TC-404 | Booking qty=2 → refund check → "Group bookings (2 tickets) are non-refundable" | P1 REGRESSION | Boundary above single (BR §8) |
| TC-407 | Refund button disabled during 4s spinner → no double-click result | P2 REGRESSION | UI robustness during async |
| TC-500 | Booking confirmation card: all fields present (ref, event, qty, price, nav links) | P0 SMOKE | Confirmation screen completeness |
| TC-501 | Quantity selector +/− buttons: 1→5→3, price preview updates | P1 SANITY | Interactive counter |
| TC-502 | Bookings list each card shows: ref, event, date, qty, price, "View Details" | P1 SANITY | List card completeness |
| TC-503 | Refund spinner visible ~4s, result hidden during, no layout shift after | P1 REGRESSION | Spinner UI behavior |
| TC-506 | Bookings page with 7+ bookings → sandbox warning banner visible | P1 REGRESSION | Conditional banner (BR §5) |

---

### 3.4 Admin Event Management (`docs/adminScenarios.md`)

#### API Tests (15)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-004 | POST /api/events with valid payload → 201 with event object | API create contract |
| TC-005 | PUT /api/events/:id → 200 with updated event | API update contract |
| TC-006 | DELETE /api/events/:id → associated bookings return 404 (cascade) | Cascade behavior verified at API |
| TC-103 | PUT /api/events/<static_id> → 403 "Cannot modify static events" | Immutability rule (BR §3) |
| TC-104 | DELETE /api/events/<static_id> → 403 | Immutability rule (BR §3) |
| TC-202 | PUT /api/events/<UserA_id> using User B's token → 403/404 | Cross-user write isolation |
| TC-203 | DELETE /api/events/<UserA_id> using User B's token → 403/404 | Cross-user delete isolation |
| TC-205 | POST /api/events without token → 401 | Auth enforcement on create |
| TC-304 | PUT /api/events/<nonexistent_id> → 404/403 | Invalid resource handling |
| TC-305 | DELETE /api/events/<nonexistent_id> → 404, no crash | Invalid resource handling |
| TC-306 | POST /api/events with 1000-char title → 400, no 500 | Input length robustness |
| TC-307 | POST /api/events with price=0 → document behavior (free events) | Price boundary |
| TC-404 | Update event price → existing bookings retain original totalPrice | Price immutability for past bookings |
| TC-405 | Update totalSeats below active bookings → document behavior, no crash | Over-booking edge case |
| TC-406 | Rapid delete 3 + create 3 events → all succeed, correct counts | Concurrency robustness |

#### E2E Tests (27)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | Fill admin form → create event → "Event created!" toast → event in list | P0 SMOKE | Core admin create flow |
| TC-002 | Edit event → update title → appears in admin list and /events | P0 SMOKE | Admin edit flow |
| TC-003 | Delete event → removed from admin + /events + cascade bookings gone | P0 SMOKE | Admin delete + cascade |
| TC-100 | 5 events → create 6th → all 6 present, no pruning | P0 REGRESSION | Boundary before FIFO |
| TC-101 | 6 events → create 7th → oldest gone, 7th present | P0 REGRESSION | FIFO trigger (BR §3) |
| TC-102 | FIFO prunes dynamic events only; static events still all present | P0 REGRESSION | Static event protection (BR §3) |
| TC-105 | /admin/events only shows user-created (dynamic) events, not static | P1 SANITY | Admin list scoping |
| TC-106 (E2E half) | Past date in form → "Event date must be in the future" shown in UI | P0 REGRESSION | Date validation UI |
| TC-107 | User has 6 events → navigate to /events → sandbox warning banner visible | P1 REGRESSION | BR §5 banner |
| TC-108 | User has 4 events → navigate to /events → NO banner | P1 REGRESSION | Banner hidden (BR §5) |
| TC-200 | Navigate to /admin/events unauthenticated → redirect to /login | P0 REGRESSION | Route protection |
| TC-201 (E2E half) | User A creates event; User B's /admin/events does NOT show it | P0 REGRESSION | Sandbox isolation visible in UI |
| TC-204 | XSS in event title → no script executes when event displayed | P1 REGRESSION | Browser XSS prevention |
| TC-300 (E2E half) | Submit empty admin form → inline validation errors, no event created | P0 REGRESSION | Form validation UI |
| TC-301 (E2E half) | Negative price → validation error UI | P1 REGRESSION | UI price validation |
| TC-302 (E2E half) | Zero seats → validation error UI | P1 REGRESSION | UI seats validation |
| TC-303 (E2E half) | Past date → validation error UI | P0 REGRESSION | UI date validation |
| TC-400 | 5 events → create 6th → no pruning (boundary correct) | P0 REGRESSION | FIFO boundary confirmation |
| TC-401 | FIFO deletes "Event Alpha" (created first), not alphabetically first | P0 REGRESSION | FIFO by creation time (BR §3) |
| TC-402 | Delete event with 2 active bookings → bookings gone from /bookings | P0 REGRESSION | Cascade visible in UI |
| TC-403 | Event title "123 Tech Fest" → booking ref starts with "1" | P2 REGRESSION | Numeric title first char (BR §7) |
| TC-500 | No user events → admin page shows empty state | P1 REGRESSION | Empty state |
| TC-501 | Click submit on empty form → inline errors, no navigation | P1 REGRESSION | Form validation |
| TC-502 | Valid form submit → "Event created!" toast appears then disappears | P1 SMOKE | Toast notification |
| TC-503 | Click edit → form pre-filled with current event values | P1 REGRESSION | Edit form state |
| TC-504 | 6 events on /events page → warning banner with "6 events" text | P1 REGRESSION | BR §5 banner text |
| TC-505 | Delete confirmation: cancel → event NOT deleted, still in list | P1 REGRESSION | Destructive action guard |

---

### 3.5 Sandbox Limits (`docs/sandboxScenarios.md`)

> **Note**: Most sandbox scenarios overlap with Admin and Booking features. Unique scenarios here focus on FIFO sequencing, banner behavior, and per-user isolation of limits.

#### API Tests (5)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-202 | Delete user account → no orphaned events or bookings (referential integrity) | DB cascade; API-level verification |
| TC-300 | Concurrent POST /api/events at limit → only one extra event created, no duplicates | Concurrency; API |
| TC-301 | GET /api/events/<pruned_id> after FIFO → 404/403 (fully removed) | Permanent deletion; API |
| TC-302 | GET /api/bookings/<pruned_id> after FIFO → 404/403 | Permanent deletion; API |
| TC-403 | Two simultaneous bookings for event with 3 seats remaining → one succeeds, no negative seats | Concurrency seat check; API |

#### E2E Tests (22)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | Create 6 events sequentially → all 6 listed, no deletion | P0 SANITY | Capacity baseline |
| TC-002 | Create 9 bookings → all 9 listed, no deletion | P0 SANITY | Booking capacity baseline |
| TC-003 | 6 events → delete 1 → create new → no pruning (6 total) | P1 REGRESSION | Count recovery |
| TC-004 | 9 bookings → cancel 1 → new booking → no pruning (9 total) | P1 REGRESSION | Count recovery |
| TC-100 | 7th event → oldest auto-deleted; Events 2–6 + 7th remain | P0 REGRESSION | FIFO sequencing |
| TC-101 | 10th booking → oldest auto-deleted; 9 remain | P0 REGRESSION | Booking FIFO |
| TC-102 | FIFO prunes only dynamic events; all 10 static events intact | P0 REGRESSION | Static protection |
| TC-103 | 7th event triggers FIFO; oldest event's 2 bookings also gone | P0 REGRESSION | Cascade on FIFO |
| TC-104 | 5 events → banner visible on /events | P1 REGRESSION | Banner at near-limit |
| TC-105 | 4 events → NO banner | P1 REGRESSION | Banner threshold |
| TC-106 | 7+ bookings → banner on /bookings | P1 REGRESSION | Bookings banner |
| TC-108 | Book 5 static event tickets → static event still shows full DB seats | P1 REGRESSION | Static seat isolation (BR §6) |
| TC-109 | Create events 7th, 8th, 9th: Event-1, Event-2, Event-3 deleted in order | P1 REGRESSION | Consecutive FIFO |
| TC-200 | User A's FIFO prune → User B's 6 events unchanged | P0 REGRESSION | Per-user FIFO isolation |
| TC-201 | User A's booking FIFO → User B's 9 bookings unchanged | P0 REGRESSION | Per-user booking FIFO |
| TC-304 | Fresh account → no warning banner on events page | P1 REGRESSION | No-false-positive banner |
| TC-400 | 6 events → delete 1 → create 1 → no FIFO (still 6) | P0 REGRESSION | Delete-then-create reset |
| TC-401 | FIFO by creation time, not alphabetical order | P0 REGRESSION | Ordering behavior |
| TC-402 | Mixed create/delete ops → counter accurate when 10th triggers FIFO | P1 REGRESSION | Counter accuracy |
| TC-404 | User A has 6 events; User B independently gets their own 6-event allowance | P1 REGRESSION | Per-user limits (BR §3) |
| TC-500 | Warning banner text explicitly says "6 events" and "9 bookings" | P1 REGRESSION | Specific limit numbers |
| TC-505 | Create 7th event via admin → oldest immediately gone from admin and /events | P0 REGRESSION | FIFO immediacy in UI |

---

### 3.6 Cross-User Security & Isolation (`docs/crossUserSecurityScenarios.md`)

#### Unit Tests (2)
| ID | Scenario | Rationale |
|----|----------|-----------|
| SEC-U-01 | Booking reference regex validation: `^[A-Z]-[A-Z0-9]{6}$` | Pure regex; unit test |
| SEC-U-02 | JWT payload decode: user ID present and non-empty | Pure string parsing; unit test |

#### API Tests (16)
| Scenario IDs | Group | Rationale |
|---|---|---|
| TC-101 | GET /api/bookings/<UserA_id> with User B's token → 403 | Core IDOR protection |
| TC-102 | DELETE /api/bookings/<UserA_id> with User B's token → 403 | Write IDOR protection |
| TC-103 | PUT /api/events/<UserA_id> with User B's token → 403/404 | Event IDOR write |
| TC-104 | DELETE /api/events/<UserA_id> with User B's token → 403/404 | Event IDOR delete |
| TC-105 | DELETE /api/bookings (clear all) with User A's token → User B's bookings untouched | Scoped bulk delete |
| TC-201 | User A's JWT → GET /api/bookings/<UserB_id> → 403 | Token scoping |
| TC-202 | GET /api/bookings/ref/<UserA_ref> with User B's token → 403/404 | Reference lookup isolation |
| TC-203 | Enumerate booking IDs → all non-owned return 403/404 | IDOR enumeration resistance |
| TC-205 | Expired/revoked token → GET /api/bookings → 401 | Token expiry enforcement |
| TC-206 | IDOR: User B modifies booking ID in URL → GET /api/bookings/<UserA_id> → 403 | Server-side ownership check |
| TC-207 | IDOR: DELETE /api/events/<UserA_id> as User B → 403/404 | Server-side event ownership |
| TC-208 | Mixed batch: User B's own booking → 200; User A's booking → 403 (independent per-request) | Per-request authorization |
| TC-301 | GET /api/bookings/<UserA_id> as User B → body is "Forbidden"/"Access Denied", no stack trace | Error message quality |
| TC-302 | GET /api/bookings/<any_id> with NO token → 401 (not 403) | Correct status code distinction |
| TC-303 | Cross-user access → 403 or 404 consistently (not leaking existence) | Resource existence privacy |
| TC-305 | User A calls GET /api/bookings/<UserA_own_id> → 200 (self-access allowed) | Sanity: own resources accessible |
| TC-404 | Delete User A account → User B's data unaffected | Cascade scoping |

#### E2E Tests (16)
| Scenario IDs | Group | Priority | Rationale |
|---|---|---|---|
| TC-001 | User A and User B each only see their own dynamic events on /events | P0 REGRESSION | Sandbox isolation UX |
| TC-002 | User B on /bookings → only User B's bookings listed | P0 REGRESSION | Booking list isolation |
| TC-003 | Both users see all 10 static events | P0 SANITY | Shared static data |
| TC-100 (E2E half) | User B navigates to /bookings/<UserA_id> → "Access Denied" shown | P0 REGRESSION | UI display of 403 (Flow 6) |
| TC-200 | Complete Flow 6: User A books → note URL → clear localStorage → login as User B → navigate to URL → "Access Denied" | P0 REGRESSION | Complete cross-user attack flow |
| TC-204 (E2E half) | User B navigates to /events/<UserA_event_id> → 404/forbidden in UI | P1 REGRESSION | Dynamic event URL isolation |
| TC-209 | User B's /admin/events shows only User B's events | P0 REGRESSION | Admin view scoping |
| TC-300 | "Access Denied" text clearly visible, no partial data, no blank screen | P1 REGRESSION | Error page quality |
| TC-400 | Login User A in Tab 1, User B in Tab 2 → no cross-contamination | P1 REGRESSION | localStorage session conflict behavior |
| TC-401 | Both users book same static event → each sees only their own booking | P1 REGRESSION | Booking isolation for shared events |
| TC-402 | User A FIFO prune → User B's event count unchanged | P1 REGRESSION | Per-user FIFO |
| TC-403 | Multi-login sequence (A → B → A) → each login shows only that user's data | P2 REGRESSION | Long-session isolation |
| TC-500 | "Access Denied" page: clean message, no raw JSON, has "View My Bookings" link | P1 REGRESSION | Error page UX |
| TC-501 | Loading state resolves to "Access Denied" — no infinite spinner on 403 | P2 REGRESSION | Error state handling |
| TC-502 | User A → /admin/events; logout; User B → /admin/events → only User B's events, no stale cache | P1 REGRESSION | Cache isolation |
| TC-503 | User A → /events; logout; User B → /events → only User B's dynamic events | P1 REGRESSION | Browse page isolation |

---

## 4. Defense-in-Depth: Rules Tested at Multiple Layers

These critical business rules are verified at both API and E2E layers for maximum confidence:

| Business Rule | API Test IDs | E2E Test IDs | Why Both Layers |
|---|---|---|---|
| Cross-user booking access → 403 | TC-101, TC-206 (Security) | TC-100 (Security), TC-200 (Security) | API enforces; UI must display "Access Denied" clearly |
| FIFO event pruning at 7th event | TC-301 (Sandbox) | TC-101 (Admin), TC-100 (Sandbox) | API must permanently delete; UI must immediately reflect |
| Booking ref first char = event title first char | TC-111 (Booking) | TC-100, TC-101 (Booking) | Format contract at API; visual on confirmation card |
| Seat count reduces immediately on booking | TC-107 (Booking) | TC-103 (Booking) | API integrity + UI visible to user |
| Static events cannot be edited/deleted | TC-103, TC-104 (Admin) | TC-102 (Admin) | 403 at API; UI must not show edit controls for static events |
| Event date must be in the future | — | TC-106 (Admin E2E half) + API half | Validation at both form submission and API |

---

## 5. Anti-Patterns Found in Scenario Suggested Layers

The scenario files suggested some sub-optimal layer assignments that have been corrected in this strategy:

| Anti-Pattern | Scenario IDs | Problem | Corrected Assignment |
|---|---|---|---|
| Input validation (400 errors) tested at E2E | AUTH TC-104, TC-105, TC-302, TC-303 | Empty/missing fields validation is API logic; E2E adds no value over API test for the rule itself | API tests for the rule; ONE E2E per feature confirms the UI error message is displayed |
| API error codes (409, 400) tested at E2E only | AUTH TC-101, TC-103 | Error codes are API contracts; E2E should verify only the user-visible error message | Added API tests; E2E only for UI error display |
| Boundary values (password 5 vs 6 chars) at E2E | AUTH TC-400, TC-401 | Pure server-side validation; E2E for boundaries duplicates API work | Primary: API; kept ONE E2E for boundary because it also confirms UI feedback |
| All events/booking UI State tests without API complement | Booking TC-500-506 | UI state tests are correctly at E2E; no anti-pattern — kept | No change |
| Long input edge cases (1000-char title, 255-char email) at E2E | AUTH TC-402, TC-403; Admin TC-306 | Server doesn't crash — this is API robustness, not browser behavior | Moved to API |
| XSS/SQL injection at API only | AUTH TC-202, TC-203 (SQL) | SQL injection is correctly API-level (parameterized queries); XSS (TC-204) must be browser-level | SQL → API only; XSS → E2E only |

---

## 6. Test File Layout

```
tests/
├── Authentication/
│   ├── auth-happy-path.spec.js       (TC-001,002,004,005,006 — SMOKE + SANITY)
│   ├── auth-validation.spec.js       (TC-100,101,103 E2E halves, TC-302,303,307,400,401 — validation UI)
│   ├── auth-security.spec.js         (TC-200,201,202,204,206 — browser security)
│   └── auth-ui-state.spec.js         (TC-500-506 — UI states)
├── EventBrowsing/
│   ├── events-browse.spec.js         (TC-001-007 — SMOKE + happy path)
│   ├── events-filter-search.spec.js  (TC-400-406, TC-300-303 — filter/search)
│   └── events-ui-state.spec.js       (TC-500-505 — UI states)
├── BookingManagement/
│   ├── booking-happy-path.spec.js    (TC-001-008 — SMOKE + SANITY)
│   ├── booking-rules.spec.js         (TC-100-110 — business rules: ref, price, seats, FIFO)
│   ├── booking-refund.spec.js        (TC-007,108,109,404,407 — refund eligibility)
│   └── booking-ui-state.spec.js      (TC-500-506 — UI states)
├── AdminEventManagement/
│   ├── admin-crud.spec.js            (TC-001-003 — SMOKE)
│   ├── admin-fifo.spec.js            (TC-100-102, TC-400,401 — FIFO rules)
│   └── admin-ui-state.spec.js        (TC-500-505 — UI states)
├── SandboxLimits/
│   ├── sandbox-limits.spec.js        (TC-001-004, TC-100-109 — FIFO boundary tests)
│   └── sandbox-banners.spec.js       (TC-104-108, TC-500,505 — warning banner UI)
└── SecurityAndIsolation/
    ├── cross-user-flow6.spec.js      (TC-200 — complete cross-user attack flow E2E)
    └── cross-user-isolation.spec.js  (TC-001-003, TC-100,204,209,300,400-403,500-503)
```

---

## 7. Test Data Strategy

| Data Type | Strategy | Reference |
|---|---|---|
| Primary test user | `sumeetshah.tsk@gmail.com` / `Quinn0x@1` | `playwright-best-practices` §Test Users |
| Secondary test user | `rahulshetty1@yahoo.com` / `Magiclife1!` | Cross-user tests |
| Dynamic event titles | `Test Event ${Date.now()}` | Unique per run, prevents collision |
| Static events | Pre-seeded (10 events); do NOT create/delete | Always available |
| Booking reference format | Regex: `^[A-Z]-[A-Z0-9]{6}$` | Validated in API + E2E |
| API mocking | Use `page.route()` for sandbox banner threshold tests | Test banner at exact count without DB ops |

---

## 8. Execution Priority

| Phase | Tests | Goal |
|---|---|---|
| Smoke (run first, block CI) | Auth TC-001,002; Events TC-001,002,004,005,007; Booking TC-001,002,003,004,005; Admin TC-001,502 | Verify app is alive |
| Sanity | Auth TC-004,005; Booking TC-006,007,008; Events TC-502,504,505; Admin TC-105; Security TC-003 | Core features work correctly |
| Regression: P0 | All P0 REGRESSION across all features | Critical rules enforced |
| Regression: P1 | All P1 REGRESSION | Standard feature coverage |
| Regression: P2 | All P2 REGRESSION | Edge cases and robustness |

---

*Consumed by: `/generate-tests` skill (`docs/test-strategy.md` → test file generation)*  
*Sources: authScenarios.md, eventsScenarios.md, bookingScenarios.md, adminScenarios.md, sandboxScenarios.md, crossUserSecurityScenarios.md*
