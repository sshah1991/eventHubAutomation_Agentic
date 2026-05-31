# EventHub Test Scenarios — Admin Event Management

**Feature**: Admin — Create, Edit, Delete User-Created Events  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §2, §3, §5, API_Documentation.md §Events, UserFlows.md §Flow 5  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 6 | TC-001–006 |
| Business Rules | 9 | TC-100–108 |
| Security | 6 | TC-200–205 |
| Negative / Error | 8 | TC-300–307 |
| Edge Cases | 7 | TC-400–406 |
| UI State | 6 | TC-500–505 |

---

## Happy Path

---

### TC-001: Create a New Event Successfully
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; user has fewer than 6 dynamic events  
**Steps**:
1. Navigate to `/admin/events`
2. Fill in: title ("Tech Meetup 2026"), category (Conference), city (Bangalore), venue ("Convention Centre"), date (future date), price (500), seats (100)
3. Click **Submit / Create**

**Expected Results**:
- Toast notification: `"Event created!"`
- New event appears in the admin event list
- Event also visible on `/events` for the same user

**Business Rule**: UserFlows §Flow 5 — create event form  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-002: Edit an Existing User-Created Event
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has at least one dynamic event  
**Steps**:
1. Navigate to `/admin/events`
2. Click Edit on an existing user-created event
3. Update the title to "Updated Tech Meetup 2026"
4. Save changes

**Expected Results**:
- Event updated successfully
- New title appears in the admin event list
- Updated event reflected on `/events` page

**Business Rule**: UserFlows §Flow 5 — edit existing events  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-003: Delete a User-Created Event
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has at least one dynamic event  
**Steps**:
1. Navigate to `/admin/events`
2. Click Delete on an existing user-created event
3. Confirm deletion if prompted

**Expected Results**:
- Event removed from admin events list
- Event no longer visible on `/events` page
- All bookings for that event are also deleted (cascade)

**Business Rule**: BusinessRules §2 — deleting event cascades to its bookings  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-004: Create Event via API
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User is authenticated; user has fewer than 6 dynamic events  
**Steps**:
1. `POST /api/events` with Bearer token and valid payload: `{ title, category, city, venue, date, price, totalSeats }`

**Expected Results**:
- HTTP 201 (or 200) with `{ data: Event }`
- Returned event has the submitted fields
- Event has an assigned `id`

**Business Rule**: API Reference — POST /api/events  
**Suggested Layer**: API  
**Test Type**: SANITY

---

### TC-005: Update Event via API
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has a dynamic event with known ID  
**Steps**:
1. `PUT /api/events/:id` with Bearer token and `{ title: "New Title" }`

**Expected Results**:
- HTTP 200 with updated event in `{ data: Event }`
- `title` in response matches "New Title"

**Business Rule**: API Reference — PUT /api/events/:id  
**Suggested Layer**: API  
**Test Type**: SANITY

---

### TC-006: Delete Event via API Cascades to Bookings
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has a dynamic event with at least one booking  
**Steps**:
1. Note the booking IDs for the event
2. `DELETE /api/events/:id` with Bearer token
3. Attempt `GET /api/bookings/:booking_id` for the previously noted bookings

**Expected Results**:
- Event deleted (200/204)
- Associated bookings return 404 or 403 (no longer exist)

**Business Rule**: BusinessRules §2 — deleting event cascades to bookings  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Business Rules

---

### TC-100: Cannot Create More Than 6 Dynamic Events — 6th Is Accepted
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has exactly 5 dynamic events  
**Steps**:
1. Create one more event

**Expected Results**:
- Event created successfully (6th event accepted)
- Admin event list shows all 6 events

**Business Rule**: BusinessRules §3 — max 6 user-created events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-101: 7th Event Creation Triggers FIFO — Oldest Dynamic Event Auto-Deleted
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has exactly 6 dynamic events; note the oldest event title  
**Steps**:
1. Create a 7th dynamic event
2. Navigate to `/admin/events`

**Expected Results**:
- Only 6 events remain
- The oldest dynamic event is no longer listed
- The newest (7th) event IS in the list

**Business Rule**: BusinessRules §3 — FIFO pruning when event limit reached  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-102: Static Events Are NOT Counted Toward the 6-Event Limit
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events; 10 static events always exist  
**Steps**:
1. Verify that static events don't count toward the 6-event limit
2. Creating a 7th dynamic event should prune the oldest dynamic (not a static) event

**Expected Results**:
- Static events remain untouched after FIFO pruning
- Only dynamic events are pruned

**Business Rule**: BusinessRules §3 — static events not counted toward limit  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-103: Cannot Edit a Static Event
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User is authenticated  
**Steps**:
1. Attempt `PUT /api/events/<static_event_id>` with Bearer token and update payload

**Expected Results**:
- HTTP 403: `"Cannot modify static events"`
- Event is unchanged

**Business Rule**: API Reference — Edit static event → 403; BusinessRules §3 — static events immutable  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-104: Cannot Delete a Static Event
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User is authenticated  
**Steps**:
1. Attempt `DELETE /api/events/<static_event_id>` with Bearer token

**Expected Results**:
- HTTP 403: `"Cannot modify static events"`
- Static event still exists in events list

**Business Rule**: API Reference — Edit static event → 403; BusinessRules §3  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-105: Static Events Not Visible in Admin Events List
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Navigate to `/admin/events`
2. Observe the event list

**Expected Results**:
- Only user-created (dynamic) events appear in the admin list
- Static events (seeded) are not shown in the admin management view

**Business Rule**: UserFlows §Flow 5 — admin shows user-created events only  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-106: Event Date Must Be in the Future
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Admin event creation form is open  
**Steps**:
1. Enter a past date (e.g., 2020-01-01) for the event date
2. Submit the form

**Expected Results**:
- HTTP 400: `"Event date must be in the future"`
- Event is not created

**Business Rule**: API Reference — Invalid event date → 400  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-107: Sandbox Warning Banner Appears When User Has 6 Events
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Navigate to `/events` (the events browse page)

**Expected Results**:
- Warning banner visible warning about sandbox event limit
- Message mentions "sandbox holds up to 6 events and 9 bookings"

**Business Rule**: BusinessRules §5 — banner appears when close to or at 6 events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-108: Sandbox Warning Banner Hidden When User Has Fewer Than 5 Events
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 4 or fewer dynamic events  
**Steps**:
1. Navigate to `/events`

**Expected Results**:
- Sandbox warning banner is NOT displayed
- Clean events list without banner noise

**Business Rule**: BusinessRules §5 — banner hidden when count is low (< 5)  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Security

---

### TC-200: Unauthenticated User Cannot Access Admin Events Page
**Category**: Security  
**Priority**: P0  
**Preconditions**: User is logged out  
**Steps**:
1. Navigate to `/admin/events` without authentication

**Expected Results**:
- Redirected to `/login`
- No admin content visible

**Business Rule**: API Reference — protected routes require auth  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: User Cannot Create Event Using Another User's Token
**Category**: Security  
**Priority**: P0  
**Preconditions**: Two user accounts; User B's event should not appear for User A  
**Steps**:
1. User A creates event via `POST /api/events`
2. Login as User B; verify User A's event does not appear in User B's admin list

**Expected Results**:
- User B's `/admin/events` only shows User B's events
- User A's events are sandboxed away

**Business Rule**: BusinessRules §2 — user sandbox isolation  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-202: User Cannot Edit Another User's Dynamic Event via API
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has a dynamic event with known ID  
**Steps**:
1. `PUT /api/events/<UserA_event_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden or 404 Not Found
- Event is not modified

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-203: User Cannot Delete Another User's Dynamic Event via API
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has a dynamic event with known ID  
**Steps**:
1. `DELETE /api/events/<UserA_event_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden or 404 Not Found
- User A's event is not deleted

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-204: XSS Payload in Event Title Field
**Category**: Security  
**Priority**: P1  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter `<img src=x onerror=alert('xss')>` as the event title
2. Submit

**Expected Results**:
- Input is sanitized/escaped in the API response and UI rendering
- No JavaScript executes when the event title is displayed on the events list

**Business Rule**: Security best practice — XSS prevention  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-205: Create Event API Rejects Request Without Token
**Category**: Security  
**Priority**: P0  
**Preconditions**: No auth token  
**Steps**:
1. `POST /api/events` with no Authorization header

**Expected Results**:
- HTTP 401 `"Unauthorized"`
- No event created

**Business Rule**: API Reference — Bearer Token required for Events  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: Create Event with Missing Required Fields Returns Validation Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin form is open  
**Steps**:
1. Submit the event creation form with no fields filled

**Expected Results**:
- HTTP 400 with validation error details for each required field
- No event created
- Error messages shown inline on the form

**Business Rule**: API Reference — Missing required fields → 400  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-301: Create Event with Negative Price Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter price = -100
2. Submit

**Expected Results**:
- HTTP 400 validation error
- Event not created
- Error message: price must be a positive number

**Business Rule**: API input validation  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-302: Create Event with Zero Seats Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter totalSeats = 0
2. Submit

**Expected Results**:
- Validation error: seats must be > 0
- Event not created

**Business Rule**: API input validation  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-303: Create Event with Past Date Is Rejected
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter event date = 2020-01-01 (past)
2. Submit

**Expected Results**:
- HTTP 400: `"Event date must be in the future"`
- Event not created

**Business Rule**: API Reference — Invalid event date → 400  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-304: Edit Non-Existent Event Returns Error
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is authenticated  
**Steps**:
1. `PUT /api/events/00000000-0000-0000-0000-000000000000` with valid payload

**Expected Results**:
- HTTP 404 Not Found or 403
- No update applied

**Business Rule**: API Reference — invalid resource  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-305: Delete Non-Existent Event Returns Error
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is authenticated  
**Steps**:
1. `DELETE /api/events/00000000-0000-0000-0000-000000000000`

**Expected Results**:
- HTTP 404 Not Found or 403
- No crash

**Business Rule**: API Reference — invalid resource  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-306: Create Event with Title Exceeding Maximum Length
**Category**: Negative  
**Priority**: P2  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter a title of 1000 characters
2. Submit

**Expected Results**:
- Validation error for title exceeding max length
- Event not created
- No 500 server error

**Business Rule**: API input validation robustness  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-307: Create Event with Price = 0 (Free Event) — Document Behavior
**Category**: Negative  
**Priority**: P2  
**Preconditions**: Admin form is open  
**Steps**:
1. Enter price = 0
2. Submit

**Expected Results**:
- Either accepted (free events allowed) or rejected with validation error
- Document actual behavior — free events may be valid  

**Business Rule**: API input validation — price boundary  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Edge Cases

---

### TC-400: Create 6th Event (Exact Limit Boundary) — No Pruning Yet
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: User has exactly 5 dynamic events  
**Steps**:
1. Create the 6th event

**Expected Results**:
- All 6 events remain (FIFO pruning only triggers at 7th)
- No automatic deletion at the boundary of 6

**Business Rule**: BusinessRules §3 — max 6; FIFO triggers when EXCEEDED  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-401: FIFO Pruning Deletes Correct (Oldest) Event
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events; the oldest is "Event Alpha" (created first)  
**Steps**:
1. Create a 7th event "Event Zeta"
2. Check the admin events list

**Expected Results**:
- "Event Alpha" (oldest) is deleted
- "Event Zeta" (newest) is present
- The 5 events between them are still present

**Business Rule**: BusinessRules §3 — FIFO (oldest deleted first)  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-402: Deleting an Event with Active Bookings Cascades Correctly
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: Dynamic event has 2 active bookings  
**Steps**:
1. Delete the event via `DELETE /api/events/:id`
2. Check user's bookings list

**Expected Results**:
- Event deleted
- Both associated bookings no longer appear in `/bookings`
- Seats count no longer tracked for the deleted event

**Business Rule**: BusinessRules §2 — deleting user cascades to events and bookings  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-403: Event Title Starting with a Number — Booking Ref First Char
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin event creation form is accessible  
**Steps**:
1. Create event titled "123 Tech Fest"
2. Book a ticket for this event
3. Observe the booking reference

**Expected Results**:
- Booking reference first character is `1` (first character of title)
- No crash or invalid reference format

**Business Rule**: BusinessRules §7 — first char of ref = first char of event title  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-404: Update Event Price — Existing Bookings Retain Original Price
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Dynamic event has a booking; event price is then updated  
**Steps**:
1. Create booking at price $500 (3 tickets → $1500 total)
2. Update event price to $1000
3. Check existing booking's total price

**Expected Results**:
- Existing booking still shows $1500 (original price at booking time)
- Price update does not retroactively alter past bookings

**Business Rule**: BusinessRules §9 — totalPrice fixed at booking time  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-405: Updating Event Seat Count Below Current Bookings
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Event has 100 seats; 80 seats are booked  
**Steps**:
1. Update event totalSeats to 50 (below current bookings of 80)

**Expected Results**:
- Either update is rejected (cannot reduce seats below confirmed bookings), OR
- Update proceeds but available seats shows negative / 0 (document behavior)
- No crash

**Business Rule**: BusinessRules §6 — seat availability computation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-406: Rapid Deletion and Recreation of Events
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User has multiple dynamic events  
**Steps**:
1. Delete 3 events rapidly in succession via API
2. Immediately create 3 new events

**Expected Results**:
- All 3 deletions succeed
- All 3 new creations succeed (user is below limit again)
- No orphaned data or inconsistent counts

**Business Rule**: BusinessRules §3 — event limit management  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: Admin Page Shows Empty State When No User Events Exist
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has no dynamic events  
**Steps**:
1. Navigate to `/admin/events`

**Expected Results**:
- Empty state message (e.g., "No events created yet")
- Create event form or CTA button still visible

**Business Rule**: UX best practice — empty state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-501: Create Event Form Validates Fields Before Submission
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin form is open  
**Steps**:
1. Click Submit without filling any fields

**Expected Results**:
- Inline validation errors shown below each required field
- Form does not submit to server
- User stays on the admin page

**Business Rule**: UX best practice — client-side validation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-502: Success Toast "Event created!" Appears After Event Creation
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is on admin page; form is filled  
**Steps**:
1. Submit a valid event creation form

**Expected Results**:
- `"Event created!"` toast notification appears briefly
- Toast disappears after a few seconds
- New event is visible in the list

**Business Rule**: UserFlows §Flow 5 — "Event created!" toast  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-503: Edit Form Pre-Fills with Existing Event Data
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has a dynamic event  
**Steps**:
1. Click Edit on an existing event

**Expected Results**:
- Edit form pre-populated with current values (title, category, city, venue, date, price, seats)
- User can modify only the fields they want to change

**Business Rule**: UserFlows §Flow 5 — edit existing events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-504: Sandbox Warning Banner Visible on Events Page at Limit
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Navigate to `/events` (not admin page)

**Expected Results**:
- Warning banner visible indicating sandbox limit reached
- Text references "6 events" limit

**Business Rule**: BusinessRules §5 — banner at/near 6 events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-505: Delete Confirmation Prompt Prevents Accidental Deletion
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has a dynamic event with bookings  
**Steps**:
1. Click Delete on an event
2. Cancel the confirmation dialog (if present)

**Expected Results**:
- Event is NOT deleted when confirmation is cancelled
- Event remains in the admin list

**Business Rule**: UX best practice — destructive action confirmation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

*End of Admin Event Management Test Scenarios*
