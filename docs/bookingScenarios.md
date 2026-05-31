# EventHub Test Scenarios — Bookings (Create, Manage & Refund)

**Feature**: Bookings — Create Booking, View Bookings, Cancel, Clear All, Refund Eligibility  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §4, §7, §8, §9, API_Documentation.md §Bookings, UserFlows.md §Flow 3 & 4  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 9 | TC-001–009 |
| Business Rules | 12 | TC-100–111 |
| Security | 6 | TC-200–205 |
| Negative / Error | 9 | TC-300–308 |
| Edge Cases | 8 | TC-400–407 |
| UI State | 7 | TC-500–506 |

---

## Happy Path

---

### TC-001: Book a Single Ticket for a Static Event
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; "Tech Conference Bangalore" has available seats  
**Steps**:
1. Navigate to `/events`
2. Click "Book Now" on "Tech Conference Bangalore"
3. Quantity selector shows 1 (default)
4. Fill in customer name, email, phone
5. Click "Confirm Booking"

**Expected Results**:
- Booking confirmation card displayed
- Booking reference shown in format `T-XXXXXX` (starts with "T" for "Tech")
- Total price = $1499 × 1 = $1499
- "View My Bookings" link is available

**Business Rule**: BusinessRules §7 — booking ref first char matches event title; §9 — totalPrice = price × qty  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-002: Book Multiple Tickets for an Event
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User is logged in; event with sufficient seats  
**Steps**:
1. Navigate to event detail for "Bollywood Night Mumbai"
2. Increase quantity to 3 using the "+" button
3. Fill customer details
4. Confirm booking

**Expected Results**:
- Booking created with quantity = 3
- Booking reference starts with "B" (for "Bollywood")
- Total price = $999 × 3 = $2997
- Available seats reduced by 3

**Business Rule**: BusinessRules §7, §9; §6 — seat count reduces immediately  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-003: View All Bookings on Bookings Page
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has at least one booking  
**Steps**:
1. Navigate to `/bookings`

**Expected Results**:
- All user bookings listed with event name, date, quantity, total price, status
- "View Details" link visible for each booking
- "Clear All Bookings" button visible

**Business Rule**: UserFlows §Flow 4 — bookings list  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-004: View Individual Booking Details
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has at least one booking  
**Steps**:
1. Navigate to `/bookings`
2. Click "View Details" on any booking

**Expected Results**:
- URL changes to `/bookings/:id`
- Full booking info displayed: reference, event title, date, venue, quantity, total price
- Customer details (name, email, phone) shown
- "Check Refund Eligibility" button visible
- Cancel booking button visible

**Business Rule**: UserFlows §Flow 4 — booking detail page  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-005: Cancel a Single Booking
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User has at least one booking  
**Steps**:
1. Navigate to `/bookings/:id`
2. Click "Cancel Booking" / Delete button
3. Confirm the cancellation if prompted

**Expected Results**:
- Booking is removed from the bookings list
- Available seats for the event are immediately restored
- Success message or redirect to `/bookings` occurs

**Business Rule**: BusinessRules §4 — deletion frees seats immediately  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-006: Clear All Bookings at Once
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has 3+ bookings  
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear All Bookings"
3. Confirm the action if prompted

**Expected Results**:
- All bookings removed in one operation
- Bookings page shows empty state
- Seats for all affected events are freed

**Business Rule**: BusinessRules §4 — "Clear All Bookings" removes all bookings  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-007: Refund Eligibility — Single Ticket Booking Is Refundable
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has a booking with quantity = 1  
**Steps**:
1. Navigate to `/bookings/:id` for a single-ticket booking
2. Click "Check Refund Eligibility"
3. Wait for the 4-second spinner to complete

**Expected Results**:
- Spinner displays for approximately 4 seconds
- Result message: `"Single-ticket bookings qualify for a full refund"`
- No API call made (client-side logic)

**Business Rule**: BusinessRules §8 — qty = 1 → refundable; 4-second spinner  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-008: Navigate to Bookings via "View My Bookings" Link After Booking
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has just completed a booking  
**Steps**:
1. After booking confirmation is displayed, click "View My Bookings"

**Expected Results**:
- Navigated to `/bookings`
- The newly created booking appears in the list

**Business Rule**: UserFlows §Flow 3 — post-booking navigation  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-009: Fetch Booking by Reference Number via API
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has a booking with reference `T-A1B2C3`  
**Steps**:
1. Call `GET /api/bookings/ref/T-A1B2C3` with Bearer token

**Expected Results**:
- HTTP 200 with full booking object
- Booking data matches the reference number used

**Business Rule**: API Reference — GET /api/bookings/ref/:ref  
**Suggested Layer**: API  
**Test Type**: SANITY

---

## Business Rules

---

### TC-100: Booking Reference First Character Matches Event Title First Character
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User books "Tech Conference Bangalore"  
**Steps**:
1. Complete a booking for "Tech Conference Bangalore"
2. Inspect the booking reference on the confirmation card

**Expected Results**:
- Booking reference starts with `T` (for "Tech")
- Format: `T-XXXXXX` where X is alphanumeric

**Business Rule**: BusinessRules §7 — first char of ref = first char of event title (uppercase)  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-101: Booking Reference First Char Validated Across Multiple Events
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User books multiple different events  
**Steps**:
1. Book "Bollywood Night Mumbai" → check reference starts with `B`
2. Book "AI Summit Hyderabad" → check reference starts with `A`
3. Book "Marathon Chennai" → check reference starts with `M`
4. Book "Holi Festival Delhi" → check reference starts with `H`

**Expected Results**:
- Each booking reference starts with the first letter of its event title (uppercase)

**Business Rule**: BusinessRules §7 — key business rule for all event bookings  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-102: Total Price = Event Price × Quantity
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User is on event detail page for "IPL Cricket Finals" ($2499)  
**Steps**:
1. Set quantity to 5
2. Confirm booking
3. Check total price on confirmation and in booking details

**Expected Results**:
- Total price = $2499 × 5 = $12495
- Price is displayed correctly on confirmation card and booking detail

**Business Rule**: BusinessRules §9 — totalPrice = price × quantity  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-103: Seat Count Reduces Immediately After Booking
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User is logged in; event "Photography Workshop" has 50 seats  
**Steps**:
1. Note the available seats on "Photography Workshop" (50)
2. Book 3 tickets
3. Navigate back to the event detail page

**Expected Results**:
- Available seats now shows 47 (50 - 3)
- Seat reduction is immediate, no refresh needed

**Business Rule**: BusinessRules §6 — seat count reduces immediately on booking  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-104: Max 9 Bookings Per User — 9th Booking Accepted
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has exactly 8 bookings  
**Steps**:
1. Create one more booking

**Expected Results**:
- Booking succeeds (9th booking created)
- All 9 bookings visible on bookings page

**Business Rule**: BusinessRules §4 — max 9 bookings  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-105: 10th Booking Triggers FIFO — Oldest Booking Automatically Deleted
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has exactly 9 bookings; note the oldest booking reference  
**Steps**:
1. Create a 10th booking
2. Navigate to `/bookings`

**Expected Results**:
- Only 9 bookings appear (10th was added, oldest was pruned)
- The oldest booking reference is no longer in the list
- The newest (10th) booking IS in the list

**Business Rule**: BusinessRules §4 — FIFO pruning when limit exceeded  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-106: Bookings Page Shows Maximum 9 Bookings at a Time
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has 9 bookings  
**Steps**:
1. Navigate to `/bookings`
2. Count the booking cards

**Expected Results**:
- Maximum 9 booking cards visible
- No pagination needed beyond 9 (system hard-caps at 9)

**Business Rule**: BusinessRules §4 — max 9 bookings displayed  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-107: Booking Deletion Immediately Frees Seats
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has a booking for "Digital Marketing Workshop" with 5 seats booked  
**Steps**:
1. Note current available seats on the event
2. Delete the booking via `DELETE /api/bookings/:id`
3. Check event's available seats again

**Expected Results**:
- Available seats increased by 5 immediately after deletion
- Confirmed via API `GET /api/events/:id`

**Business Rule**: BusinessRules §4 — deletion immediately frees seats  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-108: Refund Eligibility — Multi-Ticket Booking Is NOT Refundable
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User has a booking with quantity > 1 (e.g., 3 tickets)  
**Steps**:
1. Navigate to `/bookings/:id` for a 3-ticket booking
2. Click "Check Refund Eligibility"
3. Wait for 4-second spinner

**Expected Results**:
- Message: `"Group bookings (3 tickets) are non-refundable"`
- Spinner completes before result shown
- No API call made (frontend-only logic)

**Business Rule**: BusinessRules §8 — qty > 1 → non-refundable; N in message matches quantity  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-109: Refund Check Displays 4-Second Spinner Before Result
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User is on a booking detail page  
**Steps**:
1. Click "Check Refund Eligibility"
2. Measure the time until the result is displayed

**Expected Results**:
- A loading spinner is shown for approximately 4 seconds
- Result (eligible/non-eligible) appears only after the spinner completes

**Business Rule**: BusinessRules §8 — 4-second spinner animation before result  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-110: Same User Can Book the Same Dynamic Event Multiple Times
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: User has created a dynamic event  
**Steps**:
1. Book the dynamic event for 2 tickets
2. Book the same dynamic event again for 3 tickets

**Expected Results**:
- Both bookings are created successfully
- Available seats = totalSeats - (2 + 3) = totalSeats - 5
- This behavior is specific to dynamic (user-created) events

**Business Rule**: BusinessRules §6 — same user can book same event multiple times for testing  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-111: Booking Reference Format Validated (Pattern: X-XXXXXX)
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Multiple bookings have been created  
**Steps**:
1. Create bookings for 3 different events
2. Inspect each booking reference string

**Expected Results**:
- Each reference matches regex `^[A-Z]-[A-Z0-9]{6}$`
- First character is uppercase letter matching event title's first letter
- Second part is exactly 6 alphanumeric characters

**Business Rule**: BusinessRules §7 — booking reference format  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Security

---

### TC-200: Unauthenticated User Cannot Access Bookings
**Category**: Security  
**Priority**: P0  
**Preconditions**: User is logged out  
**Steps**:
1. Navigate to `/bookings` without authentication

**Expected Results**:
- Redirected to `/login`
- No booking data visible

**Business Rule**: API Reference — Bookings require Bearer Token  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: User Cannot View Another User's Booking via Direct URL
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has booking ID; User B is logged in  
**Steps**:
1. While logged in as User B, navigate to `/bookings/<UserA_booking_id>`

**Expected Results**:
- "Access Denied" message displayed
- HTTP 403 Forbidden from API

**Business Rule**: BusinessRules §2 — cross-user access → 403; Flow 6 — cross-user security  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-202: User Cannot Delete Another User's Booking via API
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has a booking ID; User B is authenticated  
**Steps**:
1. Call `DELETE /api/bookings/<UserA_booking_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden
- User A's booking is NOT deleted

**Business Rule**: BusinessRules §2 — cross-user access → 403  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-203: Booking API Rejects Request Without Authorization Header
**Category**: Security  
**Priority**: P0  
**Preconditions**: No auth token  
**Steps**:
1. `POST /api/bookings` without Authorization header
2. `GET /api/bookings` without Authorization header
3. `DELETE /api/bookings/:id` without Authorization header

**Expected Results**:
- All return HTTP 401 `"Unauthorized"`

**Business Rule**: API Reference — Bookings require Bearer Token  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-204: Clear All Bookings Only Clears the Authenticated User's Bookings
**Category**: Security  
**Priority**: P0  
**Preconditions**: Both User A and User B have bookings  
**Steps**:
1. Login as User A
2. Call `DELETE /api/bookings` (clear all) with User A's token
3. Login as User B and check bookings

**Expected Results**:
- Only User A's bookings are deleted
- User B's bookings remain intact

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-205: Booking Reference Lookup Only Works for Authenticated User's Own Bookings
**Category**: Security  
**Priority**: P1  
**Preconditions**: User A has booking ref `T-ABC123`; User B is authenticated  
**Steps**:
1. Call `GET /api/bookings/ref/T-ABC123` using User B's token

**Expected Results**:
- HTTP 403 Forbidden or 404 Not Found
- User B cannot look up User A's booking by reference

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: Cannot Book Event with Insufficient Available Seats
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Dynamic event with only 2 available seats; user is logged in  
**Steps**:
1. Navigate to the event detail page
2. Set quantity to 5 (exceeds available seats)
3. Click "Confirm Booking"

**Expected Results**:
- HTTP 400: `"Insufficient seats available"`
- Booking is NOT created
- Error message shown to user

**Business Rule**: API Reference — Insufficient seats → 400  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-301: Booking with Quantity 0 Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is on event detail page  
**Steps**:
1. Attempt to set quantity to 0 using the "−" button
2. Try to submit the booking

**Expected Results**:
- Quantity cannot go below 1 (button disabled at 1) OR
- API returns 400 validation error for quantity = 0

**Business Rule**: BusinessRules §9 — quantity must be ≥ 1  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-302: Booking with Missing Customer Name Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is on event detail page  
**Steps**:
1. Leave the customer name field blank
2. Fill in email and phone
3. Click "Confirm Booking"

**Expected Results**:
- Validation error for missing name field
- Booking not submitted

**Business Rule**: API Reference — Missing required fields → 400 validation error  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-303: Booking with Invalid Email Format Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is on booking form  
**Steps**:
1. Enter `notanemail` in the customer email field
2. Submit

**Expected Results**:
- Validation error for invalid email format
- Booking not created

**Business Rule**: API Reference — validation error details  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-304: Fetching Non-Existent Booking by ID Returns Error
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/bookings/00000000-0000-0000-0000-000000000000`

**Expected Results**:
- HTTP 404 Not Found or 403 Forbidden
- Appropriate error message

**Business Rule**: API Reference — invalid resource  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-305: Fetching Booking by Invalid Reference Format Returns Error
**Category**: Negative  
**Priority**: P2  
**Preconditions**: User is authenticated  
**Steps**:
1. Call `GET /api/bookings/ref/INVALID-REF-FORMAT`

**Expected Results**:
- HTTP 404 Not Found
- No booking data returned

**Business Rule**: BusinessRules §7 — booking reference format; invalid ref not found  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-306: Cancel Already-Deleted Booking Returns Error
**Category**: Negative  
**Priority**: P2  
**Preconditions**: User has previously deleted booking with known ID  
**Steps**:
1. Call `DELETE /api/bookings/:already_deleted_id`

**Expected Results**:
- HTTP 404 Not Found or 403 Forbidden
- No crash; graceful error response

**Business Rule**: API graceful error handling  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-307: Booking Form with All Fields Empty Is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User is on booking form  
**Steps**:
1. Click "Confirm Booking" without filling any customer fields

**Expected Results**:
- Validation errors displayed for all required fields (name, email, phone)
- No booking created

**Business Rule**: API Reference — Missing required fields → 400  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-308: Bookings Page When User Has No Bookings Shows Empty State
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User has zero bookings (fresh account or all cleared)  
**Steps**:
1. Navigate to `/bookings`

**Expected Results**:
- Empty state message displayed (e.g., "No bookings found")
- "Clear All Bookings" button hidden or disabled
- No errors thrown

**Business Rule**: UX robustness — empty state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Edge Cases

---

### TC-400: Quantity Boundary — Maximum 10 Tickets Per Booking
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User is on event detail page with sufficient seats  
**Steps**:
1. Use the "+" button to increase quantity to 10
2. Try to increase beyond 10

**Expected Results**:
- Quantity caps at 10 (button disabled beyond 10) OR validation error on submit
- Booking with quantity = 10 succeeds

**Business Rule**: UserFlows §Flow 3 — quantity selector 1–10  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-401: Booking for Event Where Seats = 1 and Quantity = 1 (Exact Boundary)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Dynamic event with exactly 1 available seat  
**Steps**:
1. Book 1 ticket for the event
2. Check available seats after booking

**Expected Results**:
- Booking succeeds
- Available seats drops to 0
- Second booking attempt returns "Insufficient seats available"

**Business Rule**: BusinessRules §6 — seat reduction; API Reference — 400 insufficient seats  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-402: Booking Reference Uniqueness — Two Bookings for Same Event Have Different References
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User books the same dynamic event twice  
**Steps**:
1. Book event "Tech Meetup" → note reference (e.g., `T-AB1234`)
2. Book the same event again → note reference

**Expected Results**:
- Both references start with `T`
- The 6-character random portion is different for each booking

**Business Rule**: BusinessRules §7 — references are unique via collision retry  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-403: Booking Price Calculation with Maximum Quantity (10 Tickets)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User books "AI Summit Hyderabad" ($1999) with quantity = 10  
**Steps**:
1. Set quantity to 10
2. Confirm booking
3. Inspect total price

**Expected Results**:
- Total price = $1999 × 10 = $19990
- Price displayed correctly without rounding errors

**Business Rule**: BusinessRules §9 — totalPrice = price × quantity  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-404: Refund Check for Quantity = 2 (Boundary Above Single)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User has a booking with quantity = 2  
**Steps**:
1. Navigate to `/bookings/:id` for a 2-ticket booking
2. Click "Check Refund Eligibility"

**Expected Results**:
- Message: `"Group bookings (2 tickets) are non-refundable"`
- Quantity 2 is the minimum non-refundable group booking

**Business Rule**: BusinessRules §8 — qty > 1 is non-refundable; boundary at 2  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-405: Concurrently Booking Same Event (Race Condition)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Dynamic event with exactly 1 seat remaining  
**Steps**:
1. Send two simultaneous `POST /api/bookings` requests for the same event, each for 1 seat

**Expected Results**:
- Only one booking succeeds
- The second returns HTTP 400 `"Insufficient seats available"`
- Available seats never goes negative

**Business Rule**: BusinessRules §6 — seats must not go below zero  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-406: Clear All Bookings Then Verify Seats Are Restored
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User has 3 bookings across 3 different events; note seat counts  
**Steps**:
1. Record available seats for each event before clearing
2. Call `DELETE /api/bookings` (clear all)
3. Check available seats for each event

**Expected Results**:
- Available seats for all 3 events restored to pre-booking values

**Business Rule**: BusinessRules §4 — deletion frees seats  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-407: Refund Eligibility Button Cannot Be Double-Clicked During Spinner
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: User is on booking detail page  
**Steps**:
1. Click "Check Refund Eligibility"
2. Immediately click the button again during the 4-second spinner

**Expected Results**:
- Button is disabled during the spinner animation
- Only one result is displayed after the timer completes
- No duplicate UI state or errors

**Business Rule**: BusinessRules §8 — 4-second spinner; UX robustness  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: Booking Confirmation Card Displays All Required Fields
**Category**: UI State  
**Priority**: P0  
**Preconditions**: User has just completed a booking  
**Steps**:
1. Complete a booking and observe the confirmation screen

**Expected Results**:
- Booking reference displayed prominently
- Event name, date, venue shown
- Quantity and total price confirmed
- "View My Bookings" and "Browse Events" navigation links visible

**Business Rule**: UserFlows §Flow 3 — booking confirmation card  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-501: Quantity Selector Increment and Decrement Buttons Work Correctly
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is on event detail page  
**Steps**:
1. Observe initial quantity (should be 1)
2. Click "+" 4 times → expect quantity = 5
3. Click "−" 2 times → expect quantity = 3

**Expected Results**:
- Quantity increases/decreases accurately with each click
- Price preview updates accordingly if displayed
- Cannot go below 1 (−  button disabled at 1)

**Business Rule**: UserFlows §Flow 3 — quantity selector  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-502: Bookings List Displays All Booking Summary Fields
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has at least one booking  
**Steps**:
1. Navigate to `/bookings`

**Expected Results**:
- Each booking card shows: booking reference, event name, date, quantity, total price, status
- "View Details" link is clickable

**Business Rule**: UserFlows §Flow 4 — bookings list  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-503: Refund Check Shows Spinner Before Result
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is on a booking detail page  
**Steps**:
1. Click "Check Refund Eligibility"
2. Observe UI between click and result

**Expected Results**:
- Spinner is visible for ~4 seconds
- Result text is hidden during spinner
- No layout shift or overflow when result appears

**Business Rule**: BusinessRules §8 — 4-second spinner  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-504: Empty Bookings Page Shows Friendly Empty State
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has no bookings  
**Steps**:
1. Navigate to `/bookings`

**Expected Results**:
- "No bookings found" or equivalent empty state message
- CTA to browse events is present
- No booking cards or errors shown

**Business Rule**: UX best practice — empty state  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-505: Booking Detail Page Back Navigation Works
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User is on `/bookings/:id`  
**Steps**:
1. Click "Back to Bookings" or browser back button

**Expected Results**:
- User returns to `/bookings`
- Bookings list is intact (no state loss)

**Business Rule**: UserFlows §Flow 4 — navigation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-506: Sandbox Warning Banner Visible on Bookings Page Near Limit
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User has 7+ bookings  
**Steps**:
1. Navigate to `/bookings` when user has 7 or more bookings

**Expected Results**:
- Warning banner visible: warns about sandbox booking limit (9 max)
- Banner NOT shown when booking count is low (e.g., fewer than 5)

**Business Rule**: BusinessRules §5 — conditional sandbox warning banner on bookings page  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

*End of Booking Test Scenarios*
