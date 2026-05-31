# EventHub Test Scenarios — Sandbox Limits & FIFO Pruning

**Feature**: Sandbox Limits — Event/Booking FIFO Pruning, Warning Banners, Seat Availability  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §2, §3, §4, §5, §6, UserFlows.md §Flow 5  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 4 | TC-001–004 |
| Business Rules | 10 | TC-100–109 |
| Security | 3 | TC-200–202 |
| Negative / Error | 5 | TC-300–304 |
| Edge Cases | 8 | TC-400–407 |
| UI State | 6 | TC-500–505 |

---

## Happy Path

---

### TC-001: User Can Create Up to 6 Dynamic Events Without Pruning
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has 0 dynamic events  
**Steps**:
1. Create 6 events sequentially (Event-1 through Event-6)
2. Navigate to `/admin/events`

**Expected Results**:
- All 6 events are listed
- No automatic deletion occurs
- Event count = 6

**Business Rule**: BusinessRules §3 — max 6 user-created events; FIFO only triggers when exceeded  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-002: User Can Have Up to 9 Bookings Without Pruning
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has 0 bookings  
**Steps**:
1. Create 9 bookings across different events
2. Navigate to `/bookings`

**Expected Results**:
- All 9 bookings are listed
- No automatic deletion occurs
- Booking count = 9

**Business Rule**: BusinessRules §4 — max 9 bookings; FIFO only triggers when exceeded  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-003: Deleting a Dynamic Event Brings Count Below Limit
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Delete one event via admin
2. Create a new event

**Expected Results**:
- New event created without pruning (count was 5 before creation)
- Total dynamic events = 6

**Business Rule**: BusinessRules §3 — count managed relative to current state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-004: Cancelling a Booking Brings Count Below Limit
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has 9 bookings  
**Steps**:
1. Cancel one booking
2. Create a new booking

**Expected Results**:
- New booking created without FIFO pruning (was at 8 before creation)
- Total bookings = 9

**Business Rule**: BusinessRules §4 — count managed relative to current state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Business Rules

---

### TC-100: 7th Dynamic Event Triggers FIFO — Oldest Deleted
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has exactly 6 dynamic events; record creation order (oldest first)  
**Steps**:
1. Note the title of the oldest dynamic event (Event-1)
2. Create Event-7
3. Check admin events list

**Expected Results**:
- Event-1 (oldest) is automatically deleted
- Event-7 (newest) is present
- Events 2–6 remain

**Business Rule**: BusinessRules §3 — FIFO replacement at limit  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-101: 10th Booking Triggers FIFO — Oldest Booking Deleted
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has exactly 9 bookings; note oldest booking reference  
**Steps**:
1. Note the oldest booking's reference
2. Create a 10th booking
3. Check bookings list

**Expected Results**:
- Oldest booking is automatically removed
- 10th (newest) booking is present
- Remaining 8 bookings are intact

**Business Rule**: BusinessRules §4 — FIFO at booking limit  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-102: FIFO Prunes Only Dynamic Events — Static Events Unaffected
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events; 10 static events always exist  
**Steps**:
1. Create the 7th dynamic event
2. Verify static events are still all present on `/events`

**Expected Results**:
- Only the oldest dynamic event is pruned
- All 10 static events remain intact

**Business Rule**: BusinessRules §3 — static events not counted toward limit  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-103: FIFO-Deleted Event Also Deletes Its Bookings (Cascade)
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events; oldest event (Event-1) has 2 active bookings  
**Steps**:
1. Create a 7th event to trigger FIFO
2. Check bookings list

**Expected Results**:
- Event-1 is pruned
- Both bookings for Event-1 are also deleted (cascade)
- Booking count decreases accordingly

**Business Rule**: BusinessRules §2 — deleting event cascades to bookings; §3 FIFO  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-104: Sandbox Warning Banner Appears When Close To Event Limit (5–6 Events)
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has exactly 5 dynamic events  
**Steps**:
1. Navigate to the events page

**Expected Results**:
- Sandbox warning banner visible (close to limit)
- Banner text warns: "sandbox holds up to 6 events and 9 bookings"

**Business Rule**: BusinessRules §5 — banner appears when close to or at 6 events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-105: Sandbox Warning Banner Hidden When Fewer Than 5 Events
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 4 or fewer dynamic events  
**Steps**:
1. Navigate to events page

**Expected Results**:
- No sandbox warning banner displayed
- Banner only appears at/near the limit

**Business Rule**: BusinessRules §5 — banner hidden for low counts  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-106: Sandbox Warning Banner on Bookings Page Near Booking Limit
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 7+ bookings  
**Steps**:
1. Navigate to `/bookings`

**Expected Results**:
- Conditional warning banner visible on bookings page
- Banner warns about 9-booking limit

**Business Rule**: BusinessRules §5 — bookings page banner  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-107: Per-User Seat Availability — Dynamic Events
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User A has created an event with 50 seats; User B exists  
**Steps**:
1. User A books 10 seats → available = 40
2. User B views the same event

**Expected Results**:
- User B sees the static `totalSeats` value (or the system-level availability)
- User A's bookings don't affect User B's view of seat availability for User A's own event (sandbox)

**Business Rule**: BusinessRules §6 — per-user seat availability for dynamic events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-108: Static Event Seats Are Fixed DB Field — Not User-Computed
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User books a static event  
**Steps**:
1. Book 5 tickets for "Tech Conference Bangalore" (500 seats, static)
2. Check available seats displayed on the event detail page

**Expected Results**:
- Available seats is the fixed DB value (500 for static events)
- Not dynamically reduced by user's own bookings

**Business Rule**: BusinessRules §6 — static events use fixed `availableSeats` DB field  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-109: Consecutive FIFO Pruning Works Correctly (Creating Events Repeatedly)
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Create 3 more events (7th, 8th, 9th) sequentially
2. Check admin events list after each creation

**Expected Results**:
- After 7th: Event-1 deleted
- After 8th: Event-2 deleted
- After 9th: Event-3 deleted
- Always exactly 6 dynamic events remain

**Business Rule**: BusinessRules §3 — FIFO pruning is consistent across multiple operations  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Security

---

### TC-200: FIFO Pruning Only Affects the Current User's Events
**Category**: Security  
**Priority**: P0  
**Preconditions**: Both User A and User B have 6 events each  
**Steps**:
1. Create a 7th event as User A
2. Check User B's events

**Expected Results**:
- Only User A's oldest event is deleted
- User B's 6 events remain untouched

**Business Rule**: BusinessRules §2 — sandbox isolation; FIFO is per-user  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: FIFO Pruning Only Affects the Current User's Bookings
**Category**: Security  
**Priority**: P0  
**Preconditions**: Both User A and User B have 9 bookings each  
**Steps**:
1. Create a 10th booking as User A
2. Check User B's bookings

**Expected Results**:
- Only User A's oldest booking is deleted
- User B's 9 bookings remain intact

**Business Rule**: BusinessRules §2 — booking sandbox isolation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-202: Deleting User Cascades to All Their Events and Bookings
**Category**: Security  
**Priority**: P1  
**Preconditions**: User has events and bookings; admin delete capability exists  
**Steps**:
1. Delete User A's account (if admin capability exists)
2. Check for orphaned events or bookings for User A

**Expected Results**:
- No orphaned events or bookings remain for the deleted user
- Database referential integrity maintained

**Business Rule**: BusinessRules §2 — deleting a user cascades to their events and bookings  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: Creating Events at Limit Does Not Produce Duplicate Entries
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Rapidly send two simultaneous POST /api/events requests

**Expected Results**:
- System creates only one additional event (7th), pruning the oldest
- No duplicate event entries created

**Business Rule**: BusinessRules §3 — FIFO consistency  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-301: Pruned Event Data Is Not Accessible After Auto-Deletion
**Category**: Negative  
**Priority**: P0  
**Preconditions**: User has 6 events; oldest event ID is captured  
**Steps**:
1. Create a 7th event (triggers FIFO on oldest event)
2. Call `GET /api/events/<pruned_event_id>`

**Expected Results**:
- HTTP 404 Not Found or 403 Forbidden
- Pruned event is fully removed from the system

**Business Rule**: BusinessRules §3 — FIFO auto-deletion is permanent  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-302: Pruned Booking Data Is Not Accessible After Auto-Deletion
**Category**: Negative  
**Priority**: P0  
**Preconditions**: User has 9 bookings; oldest booking ID captured  
**Steps**:
1. Create a 10th booking (triggers FIFO on oldest)
2. Call `GET /api/bookings/<pruned_booking_id>`

**Expected Results**:
- HTTP 404 or 403
- Pruned booking no longer accessible

**Business Rule**: BusinessRules §4 — FIFO deletion is permanent  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-303: Booking Deletion Does Not Affect Other Users' Booking Count
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User A and User B each have bookings  
**Steps**:
1. User A cancels all their bookings
2. Check User B's booking count

**Expected Results**:
- User B's booking count unchanged
- No cross-user side effects

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-304: Warning Banner Does Not Appear When User Has No Events
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User has 0 dynamic events (fresh account)  
**Steps**:
1. Navigate to events page

**Expected Results**:
- No sandbox warning banner visible
- Clean, minimal UI for new users

**Business Rule**: BusinessRules §5 — banner hidden for low counts  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Edge Cases

---

### TC-400: Create Exactly 6 Events Then Delete One — No FIFO Triggered
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Delete Event-3 (middle event)
2. Create a new event (Event-7)

**Expected Results**:
- New event created without pruning (count was 5 before creation)
- All remaining original events (1,2,4,5,6) plus new event exist = 6 total
- No FIFO triggered

**Business Rule**: BusinessRules §3 — FIFO only when creating BEYOND 6  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-401: FIFO Respects Creation Order — Not Alphabetical or ID Order
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: User creates 6 events; Event-6 has an earlier alphabetical name than Event-1  
**Steps**:
1. Create events: "Zeta Event" (1st), "Alpha Event" (2nd) ... up to 6
2. Create a 7th event

**Expected Results**:
- "Zeta Event" is deleted (it was created first, regardless of alphabetical order)
- FIFO is based on creation time, not name/ID sorting

**Business Rule**: BusinessRules §3 — FIFO (oldest by creation time)  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-402: Booking Limit Counter Accurate After Mixed Create/Delete Operations
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User starts with 5 bookings  
**Steps**:
1. Create 4 more bookings (total = 9)
2. Delete 3 bookings (total = 6)
3. Create 4 more bookings (expected: 10th triggers FIFO → 9 remain)

**Expected Results**:
- Booking count correctly tracks after mixed operations
- FIFO triggers correctly at the 10th creation

**Business Rule**: BusinessRules §4 — accurate count tracking  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-403: Available Seats Never Go Negative for Dynamic Events
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: Dynamic event with 3 seats remaining  
**Steps**:
1. Two users attempt to book 3 seats each simultaneously (race condition)

**Expected Results**:
- Available seats never drops below 0
- One booking succeeds; the other fails with "Insufficient seats"

**Business Rule**: BusinessRules §6 — seat availability computation; §4 API Reference 400  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-404: Sandbox Limit Is Per-User, Not Global
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User A has 6 events; User B has 0 events  
**Steps**:
1. User B creates 6 events

**Expected Results**:
- User B can create all 6 without interference from User A's count
- Each user independently gets their own 6-event allowance

**Business Rule**: BusinessRules §3 — per-user event sandbox  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-405: FIFO-Pruned Event Bookings Are Freed — Seat Count Reconciled
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User has 6 events; oldest event has 50 seats booked by user  
**Steps**:
1. Create a 7th event (triggers FIFO, oldest event deleted, its bookings cascade-deleted)
2. Note total bookings count

**Expected Results**:
- Booking count decreases by the number of bookings on the pruned event
- User may now create more bookings up to the new count

**Business Rule**: BusinessRules §3 — cascade on FIFO deletion; §4 booking count  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-406: Booking Limit Counter Accurate After Clear All Bookings
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User has 9 bookings  
**Steps**:
1. Click "Clear All Bookings"
2. Create 9 new bookings
3. Create a 10th booking

**Expected Results**:
- Counter resets to 0 after clear
- 9 new bookings created without pruning
- 10th booking triggers FIFO (oldest of the 9 new bookings deleted)

**Business Rule**: BusinessRules §4 — counter resets after clear  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-407: Dynamic Event Seat Availability Computed Per-User (Isolation)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User A creates an event with 100 seats; both User A and User B are logged in  
**Steps**:
1. User A books 30 seats → A sees 70 available
2. User B navigates to the same event

**Expected Results**:
- User B sees the full `totalSeats` (100) or a different computed value since B has no bookings
- Per-user seat computation does not cross user boundaries

**Business Rule**: BusinessRules §6 — dynamic event seats computed as `totalSeats - sum(user's bookings)`  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: Warning Banner Text Contains Specific Limit Numbers (6 events, 9 bookings)
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has 5+ events, triggering the banner  
**Steps**:
1. Navigate to the events page and observe the warning banner

**Expected Results**:
- Banner text explicitly mentions "6 events" and "9 bookings"
- No generic warning — specific numbers are shown

**Business Rule**: BusinessRules §5 — banner warns about sandbox limits  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-501: Warning Banner Is Dismissible or Static — Document Behavior
**Category**: UI State  
**Priority**: P2  
**Preconditions**: Warning banner is visible  
**Steps**:
1. Check if the warning banner has a close/dismiss button
2. If yes: click it; navigate away and back

**Expected Results**:
- Document whether banner is dismissible or always shown at limit
- Consistent behavior after dismiss and re-navigation

**Business Rule**: BusinessRules §5 — banner behavior  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-502: Bookings Page Shows Correct Count in Header or Summary
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has 7 bookings  
**Steps**:
1. Navigate to `/bookings`
2. Check if page shows booking count (e.g., "7 of 9 bookings used")

**Expected Results**:
- If count is displayed, it matches actual bookings (7)
- No stale counter from previous session

**Business Rule**: BusinessRules §4 — max 9 bookings  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-503: Banner Updates Dynamically When Event/Booking Count Changes
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User has 5 events (banner visible)  
**Steps**:
1. Delete an event (count drops to 4)
2. Observe the banner status

**Expected Results**:
- Banner disappears after count drops below the threshold (4 events)
- No stale banner persists

**Business Rule**: BusinessRules §5 — banner is conditional on count  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-504: Admin Events Page Shows Event Count / Limit Status
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User has 4 dynamic events  
**Steps**:
1. Navigate to `/admin/events`
2. Observe if a count indicator (e.g., "4/6 events used") is present

**Expected Results**:
- If displayed, count is accurate
- Helps users understand remaining sandbox capacity

**Business Rule**: BusinessRules §5 — sandbox awareness  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-505: Newly Pruned Event Immediately Disappears from Admin and Events List
**Category**: UI State  
**Priority**: P0  
**Preconditions**: User has 6 dynamic events  
**Steps**:
1. Create a 7th event via admin form
2. Immediately observe the admin events list and events browse page

**Expected Results**:
- Oldest event is no longer visible in admin list
- Oldest event does not appear on `/events` browse page
- No stale/cached version shown

**Business Rule**: BusinessRules §3 — FIFO deletion is immediate  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

*End of Sandbox Limits & FIFO Test Scenarios*
