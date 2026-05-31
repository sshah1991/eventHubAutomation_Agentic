# EventHub Test Scenarios — Events (Browse, Search, Filter)

**Feature**: Events — Browse, Search, Filter, Pagination  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §3, §6, API_Documentation.md §Events, UserFlows.md §Flow 2  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 7 | TC-001–007 |
| Business Rules | 8 | TC-100–107 |
| Security | 5 | TC-200–204 |
| Negative / Error | 7 | TC-300–306 |
| Edge Cases | 7 | TC-400–406 |
| UI State | 6 | TC-500–505 |

---

## Happy Path

---

### TC-001: Authenticated User Can View Events List
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to `/events`
2. Observe the events list

**Expected Results**:
- At least the 10 seeded static events are displayed
- Each event card shows title, category, city, venue, price, and available seats
- "Book Now" button is visible on each card

**Business Rule**: UserFlows §Flow 2 — logged-in user can browse events  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-002: Search Events by Title
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; events page is open  
**Steps**:
1. Type `Tech` in the search bar
2. Observe filtered results

**Expected Results**:
- Only events whose title, description, or venue contains "Tech" are shown
- "Tech Conference Bangalore" appears in results
- Events not matching "Tech" are hidden

**Business Rule**: UserFlows §Flow 2 — search bar filters by title, description, venue  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-003: Search Events by Description Keyword
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User is logged in; events page is open  
**Steps**:
1. Enter a keyword that appears only in an event's description field
2. Observe results

**Expected Results**:
- Events matching the description keyword are returned
- Search is not limited to title alone

**Business Rule**: UserFlows §Flow 2 — search covers title, description, venue  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-004: Filter Events by Category
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; events page is open  
**Steps**:
1. Select `Conference` from the category dropdown
2. Observe filtered results

**Expected Results**:
- Only Conference events are shown (e.g., Tech Conference Bangalore, AI Summit Hyderabad)
- Events from other categories are hidden

**Business Rule**: UserFlows §Flow 2 — category filter dropdown  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-005: Filter Events by City
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; events page is open  
**Steps**:
1. Select `Bangalore` from the city dropdown
2. Observe filtered results

**Expected Results**:
- Only Bangalore events shown (Tech Conference Bangalore, Food Festival Bangalore)
- Events in other cities are hidden

**Business Rule**: UserFlows §Flow 2 — city filter dropdown  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-006: Combined Search and Category Filter
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User is logged in; events page is open  
**Steps**:
1. Select `Workshop` from the category dropdown
2. Type `Photography` in the search bar
3. Observe results

**Expected Results**:
- Only "Photography Workshop" is returned (matches both filters)
- "Digital Marketing Workshop" is excluded (doesn't match search term)

**Business Rule**: UserFlows §Flow 2 — filters work in combination  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-007: Navigate to Event Detail Page via "Book Now"
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; events list is visible  
**Steps**:
1. Click "Book Now" on the "Tech Conference Bangalore" card
2. Observe navigation

**Expected Results**:
- URL changes to `/events/:id` for that event
- Event detail page shows: title, date, venue, price per ticket, available seats
- Booking form (quantity selector, customer fields) is visible

**Business Rule**: UserFlows §Flow 2 → Flow 3 — clicking "Book Now" navigates to event detail  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

## Business Rules

---

### TC-100: Events Page Shows Maximum 9 Events per Page (Pagination)
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is logged in; at least 10 events exist  
**Steps**:
1. Navigate to `/events`
2. Count the number of event cards on page 1

**Expected Results**:
- No more than 9 events displayed per page (as per BusinessRules §3)
- Pagination controls are visible if total events exceed 9

**Business Rule**: BusinessRules §3 — Events page shows max 9 events at a time  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-101: Pagination — Navigate to Next Page
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is logged in; more than 9 events exist  
**Steps**:
1. Navigate to `/events`
2. Click the "Next" or page 2 pagination button

**Expected Results**:
- Page 2 loads with the next set of events
- Previously seen events from page 1 are not duplicated
- URL or state reflects current page

**Business Rule**: BusinessRules §3 — pagination for events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-102: Static Events Are Shared Across All Users
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Two different user accounts exist  
**Steps**:
1. Login as User A and navigate to `/events`; note the static event list
2. Logout and login as User B; navigate to `/events`

**Expected Results**:
- All 10 seeded static events appear for both User A and User B
- Static events include: Tech Conference Bangalore, Bollywood Night Mumbai, IPL Cricket Finals, etc.

**Business Rule**: BusinessRules §2 — static events are shared across all users  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-103: User-Created Events Are Only Visible to Their Creator
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A has created a dynamic event  
**Steps**:
1. Login as User A; create an event titled "User A Private Event"
2. Logout and login as User B
3. Navigate to `/events`; search for "User A Private Event"

**Expected Results**:
- "User A Private Event" is NOT visible to User B
- User B only sees their own dynamic events + shared static events

**Business Rule**: BusinessRules §2 — user sandbox isolation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-104: Available Seats for Static Events Reflects DB Value
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to the "IPL Cricket Finals" event detail page
2. Check the displayed available seats

**Expected Results**:
- Available seats shown is the static DB field (40,000 for IPL Cricket Finals)
- Not computed dynamically for static events

**Business Rule**: BusinessRules §6 — static events use fixed `availableSeats` DB field  
**Suggested Layer**: E2E, API  
**Test Type**: SANITY

---

### TC-105: Available Seats for User-Created Events Computed Dynamically
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is logged in; user has created an event with 100 seats and made a booking of 10  
**Steps**:
1. Create event with 100 total seats
2. Book 10 seats for that event
3. Navigate back to the event detail page

**Expected Results**:
- Available seats shows 90 (100 - 10)
- Computed as `totalSeats - sum(user's booking quantities)`

**Business Rule**: BusinessRules §6 — dynamic events compute availableSeats  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-106: GET /api/events Requires Bearer Token
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: No auth token  
**Steps**:
1. Call `GET /api/events` without Authorization header

**Expected Results**:
- HTTP 401: `"Unauthorized"`
- No event data returned

**Business Rule**: API Reference — Events require Bearer Token  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-107: GET /api/events Returns Pagination Metadata
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/events?page=1&limit=9` with valid Bearer token

**Expected Results**:
- Response includes `{ data: Event[], pagination }` object
- `pagination` contains total count, current page, total pages

**Business Rule**: API Reference — GET /api/events returns `{ data, pagination }`  
**Suggested Layer**: API  
**Test Type**: SANITY

---

## Security

---

### TC-200: Unauthenticated User Cannot Access Events Page
**Category**: Security  
**Priority**: P0  
**Preconditions**: User is logged out  
**Steps**:
1. Navigate to `/events` without being logged in

**Expected Results**:
- Redirected to `/login`
- No event data visible

**Business Rule**: API Reference — Protected routes require auth  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: Direct API Access to Events Without Token Returns 401
**Category**: Security  
**Priority**: P0  
**Preconditions**: No token available  
**Steps**:
1. Call `GET /api/events` with no Authorization header
2. Call `GET /api/events/1` with no Authorization header

**Expected Results**:
- Both return HTTP 401 `"Unauthorized"`
- No event data leaked

**Business Rule**: API Reference — Bearer Token required for Events  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-202: XSS Payload in Search Bar
**Category**: Security  
**Priority**: P1  
**Preconditions**: User is logged in; events page open  
**Steps**:
1. Type `<script>alert('xss')</script>` in the search bar
2. Observe UI response

**Expected Results**:
- No JavaScript alert executes
- Search input is safely escaped / sanitized
- No events matching the payload are shown (or empty results)

**Business Rule**: Security best practice — XSS prevention in search inputs  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-203: Cannot Access Another User's Dynamic Event via Direct API Call
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has a dynamic event with a known ID  
**Steps**:
1. Login as User B
2. Call `GET /api/events/<UserA_EventId>` using User B's token

**Expected Results**:
- Either returns 403 Forbidden, OR
- Event is not returned (404 or empty) because User B's sandbox doesn't include it

**Business Rule**: BusinessRules §2 — user sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-204: Tampered Event ID in URL Returns Appropriate Error
**Category**: Security  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to `/events/99999999` (a non-existent event ID)

**Expected Results**:
- 404 error page or appropriate "Event not found" message
- No server crash or data leakage

**Business Rule**: API Reference — invalid resource access handled gracefully  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: Search with No Matching Results Shows Empty State
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is logged in; events page open  
**Steps**:
1. Enter `zzznomatchxxx` in the search bar

**Expected Results**:
- Empty state shown (e.g., "No events found" message)
- Page does not crash or show a blank white screen

**Business Rule**: UserFlows §Flow 2 — search bar behavior  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-301: Filter by Category with No Events in That Category
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is logged in; a category exists with no events  
**Steps**:
1. Select a category that has no matching events
2. Observe results

**Expected Results**:
- Empty state displayed
- No error thrown

**Business Rule**: UserFlows §Flow 2 — category filter  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-302: Navigating to Non-Existent Event ID Returns Error
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Call `GET /api/events/00000000-0000-0000-0000-000000000000`

**Expected Results**:
- HTTP 404 or appropriate error response
- "Event not found" message in UI

**Business Rule**: API Reference — invalid resource  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-303: Search Bar with Only Whitespace Returns All or Empty Results
**Category**: Negative  
**Priority**: P2  
**Preconditions**: User is logged in; events page open  
**Steps**:
1. Type `   ` (spaces only) in the search bar

**Expected Results**:
- Either returns all events (whitespace treated as empty search) OR
- Returns no results — document actual behavior
- No crash

**Business Rule**: Input sanitization  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-304: API Search with Special Characters Does Not Crash Server
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/events?search=';DROP TABLE events;--` with Bearer token

**Expected Results**:
- HTTP 200 with empty/filtered results, or 400 validation error
- No 500 server error
- Database is not affected

**Business Rule**: Security/Negative — SQL injection via query param  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-305: Pagination Page Beyond Total Pages Returns Empty or Last Page
**Category**: Negative  
**Priority**: P2  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/events?page=9999&limit=9` with Bearer token

**Expected Results**:
- HTTP 200 with empty `data` array OR redirects to last valid page
- No 500 error

**Business Rule**: API Reference — pagination query params  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-306: Negative Limit Value in API Query Is Rejected
**Category**: Negative  
**Priority**: P2  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/events?page=1&limit=-5` with Bearer token

**Expected Results**:
- HTTP 400 validation error, OR defaults to a safe limit value
- No crash or unexpected behavior

**Business Rule**: API input validation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Edge Cases

---

### TC-400: Search is Case-Insensitive
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Search for `tech conference` (all lowercase)
2. Then search for `TECH CONFERENCE` (all uppercase)

**Expected Results**:
- Both searches return "Tech Conference Bangalore"
- Search is case-insensitive

**Business Rule**: UserFlows §Flow 2 — search behavior  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-401: Clearing Search/Filters Restores Full Events List
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User has applied a search term and category filter  
**Steps**:
1. Apply search `Tech` and category `Conference`
2. Clear the search field
3. Reset the category to default

**Expected Results**:
- All events (including previously filtered-out ones) are visible again
- Page count resets to full pagination

**Business Rule**: UserFlows §Flow 2 — filter state management  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-402: Event with Zero Available Seats Still Displays
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: A user-created event exists with 0 available seats  
**Steps**:
1. Create an event with 1 total seat
2. Book 1 seat for that event
3. Return to the events list

**Expected Results**:
- Event still appears on the list
- Available seats shows 0
- "Book Now" button either disabled or booking page shows "Insufficient seats" error

**Business Rule**: BusinessRules §6 — seat availability computed dynamically  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-403: API Search Param with Very Long String (500 chars)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/events?search=<500-char string>` with Bearer token

**Expected Results**:
- Either returns empty results (no match) or 400 validation error
- No 500 server error or crash

**Business Rule**: Input length robustness  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-404: Simultaneous Category and City Filter with No Results
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User is logged in  
**Steps**:
1. Select `Sports` category AND `Mumbai` city (no sports events in Mumbai in seed data)

**Expected Results**:
- Empty state message displayed
- No events shown

**Business Rule**: UserFlows §Flow 2 — combined filters  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-405: Rapidly Switching Category Filters Does Not Produce Stale Results
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User is logged in  
**Steps**:
1. Rapidly switch category filter: Conference → Concert → Workshop → Festival in quick succession

**Expected Results**:
- Final filter selection (Festival) is reflected accurately
- No stale results from previous filter displayed
- No duplicate API calls cause mixed results

**Business Rule**: UX robustness — race condition prevention  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-406: Events List Correctly Reflects Newly Created Event
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to Admin and create a new event titled "My Unique Test Event 2026"
2. Navigate to `/events`
3. Search for "My Unique Test Event 2026"

**Expected Results**:
- Newly created event appears in the events list immediately
- No page refresh required (or a standard page reload suffices)

**Business Rule**: Flow 5 → Flow 2 — created events visible in browse  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: Events Page Shows Loading State While Fetching
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User is logged in; network throttled to Slow 3G  
**Steps**:
1. Navigate to `/events` with throttled network

**Expected Results**:
- A loading spinner or skeleton card is shown while data loads
- Page does not flash blank content before data arrives

**Business Rule**: UX best practice — loading state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-501: Empty State Shown When No Events Match Filters
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Apply a search term that returns no results

**Expected Results**:
- Friendly "No events found" message displayed
- Pagination is hidden (no pages when results are empty)

**Business Rule**: UX best practice — empty state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-502: Event Card Displays All Required Fields
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is logged in; events page loaded  
**Steps**:
1. Observe any event card on the events list

**Expected Results**:
- Card shows: title, category badge, city, venue, date, price, available seats
- "Book Now" CTA button present

**Business Rule**: UserFlows §Flow 2 — event card elements  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-503: Pagination Controls Visible Only When Events Exceed Page Size
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has fewer than 9 total visible events  
**Steps**:
1. Delete all user-created events so only a few static events would appear (or filter to a small set)
2. Navigate to `/events`

**Expected Results**:
- Pagination controls are hidden when total events ≤ 9
- Only displayed when total events > 9

**Business Rule**: BusinessRules §3 — max 9 per page  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-504: Search and Filter Controls Are Visible and Functional on Page Load
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to `/events`
2. Verify presence of: search bar, category dropdown, city dropdown

**Expected Results**:
- All three filter controls are visible and interactable
- Default state: search empty, dropdowns showing "All" / default option

**Business Rule**: UserFlows §Flow 2 — browse & filter controls  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-505: Event Detail Page Shows All Event Information
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Click "Book Now" on any event to navigate to `/events/:id`

**Expected Results**:
- Page displays: event title, date, venue, price per ticket, available seats, description
- Booking form visible below event details
- "Back to Events" or breadcrumb navigation available

**Business Rule**: UserFlows §Flow 3 — event detail page elements  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

*End of Events Test Scenarios*
