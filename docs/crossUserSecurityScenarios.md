# EventHub Test Scenarios — Cross-User Security & Isolation

**Feature**: Cross-User Security — Sandbox Isolation, Access Control, Data Separation  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §2, §3, §4, API_Documentation.md §Error Scenarios, UserFlows.md §Flow 6  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 3 | TC-001–003 |
| Business Rules | 6 | TC-100–105 |
| Security | 10 | TC-200–209 |
| Negative / Error | 6 | TC-300–305 |
| Edge Cases | 5 | TC-400–404 |
| UI State | 4 | TC-500–503 |

---

## Happy Path

---

### TC-001: User A and User B Each See Only Their Own Events
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User A and User B both have dynamic events with distinct titles  
**Steps**:
1. Login as User A; note dynamic event titles
2. Logout and login as User B
3. Navigate to `/events`

**Expected Results**:
- User B does NOT see User A's dynamic events
- User B only sees their own dynamic events + shared static events

**Business Rule**: BusinessRules §2 — each user only sees their own dynamic events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-002: User A and User B Each See Only Their Own Bookings
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User A has bookings; User B is logged in  
**Steps**:
1. Login as User B
2. Navigate to `/bookings`

**Expected Results**:
- User B sees only their own bookings
- User A's bookings are NOT listed

**Business Rule**: BusinessRules §2 — sandbox isolation for bookings  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-003: Static Events Are Visible to All Users
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: Multiple user accounts exist  
**Steps**:
1. Login as User A; note the 10 static events visible
2. Logout and login as User B; navigate to `/events`

**Expected Results**:
- All 10 seeded static events visible for both User A and User B
- Static event count is consistent across users

**Business Rule**: BusinessRules §2 — static events are shared across all users  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

## Business Rules

---

### TC-100: Cross-User Booking Access Returns 403 Forbidden
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A has a booking with known ID  
**Steps**:
1. Login as User B
2. Navigate to `/bookings/<UserA_booking_id>` in browser

**Expected Results**:
- "Access Denied" message displayed in UI
- HTTP 403 Forbidden from underlying API

**Business Rule**: BusinessRules §2 — cross-user access → 403 Forbidden  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-101: Cross-User Booking API Call Returns 403 Forbidden
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A's booking ID is known; User B is authenticated  
**Steps**:
1. `GET /api/bookings/<UserA_booking_id>` using User B's Bearer token

**Expected Results**:
- HTTP 403: `"Forbidden"` or `"Access Denied"`
- No booking data returned

**Business Rule**: API Reference — Cross-user booking access → 403  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-102: User Cannot Delete Another User's Booking
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A has a booking; User B is authenticated  
**Steps**:
1. `DELETE /api/bookings/<UserA_booking_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden
- User A's booking still exists

**Business Rule**: BusinessRules §2 — cross-user write access → 403  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-103: User Cannot Edit Another User's Dynamic Event
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A has a dynamic event; User B is authenticated  
**Steps**:
1. `PUT /api/events/<UserA_event_id>` using User B's token with `{ title: "Hacked" }`

**Expected Results**:
- HTTP 403 Forbidden or 404
- User A's event title is unchanged

**Business Rule**: BusinessRules §2 — sandbox isolation for events  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-104: User Cannot Delete Another User's Dynamic Event
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A has a dynamic event; User B is authenticated  
**Steps**:
1. `DELETE /api/events/<UserA_event_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden or 404
- User A's event still exists

**Business Rule**: BusinessRules §2 — sandbox isolation for events  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-105: Clear All Bookings Scoped to Current User Only
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: User A and User B both have bookings  
**Steps**:
1. Login as User A
2. `DELETE /api/bookings` (clear all) using User A's token
3. Login as User B; check bookings

**Expected Results**:
- User A's bookings deleted
- User B's bookings remain untouched

**Business Rule**: BusinessRules §2 — DELETE /api/bookings is scoped to authenticated user  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Security

---

### TC-200: Complete Cross-User Attack Flow (UI — Flow 6)
**Category**: Security  
**Priority**: P0  
**Preconditions**: Two user accounts; User A has made a booking  
**Steps**:
1. Login as User A; complete a booking; note the booking URL `/bookings/:id`
2. Clear localStorage; login as User B
3. Navigate to User A's booking URL

**Expected Results**:
- "Access Denied" displayed
- User B cannot view User A's booking data through the UI

**Business Rule**: UserFlows §Flow 6 — complete cross-user security flow  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: JWT From User A Cannot Be Used to Access User B's Data
**Category**: Security  
**Priority**: P0  
**Preconditions**: Both users are authenticated; tokens captured  
**Steps**:
1. Capture User A's JWT
2. Use User A's JWT to call `GET /api/bookings/<UserB_booking_id>`

**Expected Results**:
- HTTP 403 Forbidden
- User A's token does not grant access to User B's resources

**Business Rule**: BusinessRules §2 — tokens are user-scoped  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-202: User B Cannot Look Up User A's Booking by Reference
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has booking with reference `T-ABC123`; User B is authenticated  
**Steps**:
1. `GET /api/bookings/ref/T-ABC123` using User B's token

**Expected Results**:
- HTTP 403 Forbidden or 404 Not Found
- Reference lookup is user-scoped

**Business Rule**: BusinessRules §2 — sandbox isolation  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-203: Enumerating Booking IDs Does Not Leak Other Users' Data
**Category**: Security  
**Priority**: P0  
**Preconditions**: User B is authenticated  
**Steps**:
1. Enumerate sequential IDs: `GET /api/bookings/1`, `/api/bookings/2`, etc.
2. Or attempt UUIDs close to known User A booking IDs

**Expected Results**:
- Returns 403 or 404 for all bookings not owned by User B
- No User A data is returned regardless of ID guessing

**Business Rule**: BusinessRules §2 — cross-user access → 403  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-204: Event Created by User A Not Accessible for Booking by User B
**Category**: Security  
**Priority**: P1  
**Preconditions**: User A creates a dynamic event; User B is logged in  
**Steps**:
1. User B attempts to navigate to `/events/<UserA_event_id>`
2. User B attempts to book tickets for User A's event

**Expected Results**:
- Event not visible in User B's events list
- Direct URL access: 404 or 403 from API
- Booking not possible for User B on User A's private event

**Business Rule**: BusinessRules §2 — dynamic events scoped to creator  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-205: Expired Session Does Not Allow Access to Protected Data
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A's token has expired or been invalidated  
**Steps**:
1. Use an expired/revoked JWT to call `GET /api/bookings`

**Expected Results**:
- HTTP 401 Unauthorized
- No booking data returned

**Business Rule**: API Reference — Missing/invalid auth token → 401  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-206: IDOR (Insecure Direct Object Reference) — Booking ID Manipulation
**Category**: Security  
**Priority**: P0  
**Preconditions**: User B is authenticated; User A has bookings with numeric or UUID IDs  
**Steps**:
1. User B modifies the booking ID in the URL to User A's booking ID
2. `GET /api/bookings/<UserA_id>` using User B's token

**Expected Results**:
- HTTP 403 Forbidden
- Server-side ownership check enforced (not just client-side)

**Business Rule**: BusinessRules §2 — ownership validated server-side  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-207: IDOR — Event ID Manipulation for Admin Operations
**Category**: Security  
**Priority**: P0  
**Preconditions**: User A has a dynamic event; User B is authenticated  
**Steps**:
1. User B sends `DELETE /api/events/<UserA_event_id>` using their token

**Expected Results**:
- HTTP 403 or 404
- User A's event is not deleted

**Business Rule**: BusinessRules §2 — ownership validated server-side  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-208: Batch Request With Mixed Valid/Invalid Booking IDs
**Category**: Security  
**Priority**: P1  
**Preconditions**: User B is authenticated; mix of User B's and User A's booking IDs known  
**Steps**:
1. Request User B's own booking → should succeed
2. Request User A's booking → should fail with 403

**Expected Results**:
- Each request is independently authorized
- Successful own-booking request does not grant access to other-user bookings in the same session

**Business Rule**: BusinessRules §2 — per-request authorization  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-209: Admin Page Shows Only Current User's Events (Not All Users' Events)
**Category**: Security  
**Priority**: P0  
**Preconditions**: Multiple users have created events  
**Steps**:
1. Login as User B
2. Navigate to `/admin/events`

**Expected Results**:
- Only User B's events displayed
- User A's events are not visible

**Business Rule**: BusinessRules §2 — admin view scoped to current user  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: "Access Denied" UI Message Shown Clearly on 403
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User B navigates to User A's booking URL  
**Steps**:
1. Navigate to `/bookings/<UserA_booking_id>` as User B

**Expected Results**:
- "Access Denied" text clearly visible on the page
- No partial data from User A's booking shown
- No blank white screen or unhandled error

**Business Rule**: BusinessRules §2 — cross-user access returns "Access Denied" message  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-301: API 403 Response Has Correct Error Message Body
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User B attempts cross-user API access  
**Steps**:
1. `GET /api/bookings/<UserA_booking_id>` using User B's token
2. Inspect response body

**Expected Results**:
- HTTP 403
- Body contains: `"Forbidden"` or `"Access Denied"` message
- No stack trace or internal error details leaked

**Business Rule**: API Reference — Cross-user booking access → 403  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-302: Using No Token on Protected Cross-User URL Returns 401, Not 403
**Category**: Negative  
**Priority**: P2  
**Preconditions**: No auth token  
**Steps**:
1. `GET /api/bookings/<any_booking_id>` with no Bearer token

**Expected Results**:
- HTTP 401 (Unauthorized — no token) rather than 403 (Forbidden — wrong user)
- Correct HTTP status code for unauthenticated vs unauthorized

**Business Rule**: API Reference — 401 for missing token; 403 for wrong ownership  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-303: Cross-User Access Attempt Does Not Expose Resource Existence
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User A has booking; User B attempts access  
**Steps**:
1. User B calls `GET /api/bookings/<UserA_booking_id>`
2. Note whether the response is 403 (exists but forbidden) or 404 (appears not to exist)

**Expected Results**:
- Either 403 or 404 returned consistently
- Server does NOT leak whether the resource exists to an unauthorized user (security: prefer 404 for IDOR scenarios)
- Consistent and documented behavior

**Business Rule**: Security best practice — do not leak resource existence  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-304: Logout and Same-Session Token Reuse Blocked
**Category**: Negative  
**Priority**: P0  
**Preconditions**: User is logged in; token captured  
**Steps**:
1. Capture current JWT token
2. Logout (clear localStorage)
3. Log in as User B
4. Use User A's token in Authorization header to call `GET /api/bookings`

**Expected Results**:
- If server maintains token state: 401 Unauthorized for User A's token
- If stateless JWT: returns User A's data (document this behavior)
- UI reflects only User B's session

**Business Rule**: Security — post-logout token behavior  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-305: Self-Reference — User's Own Booking Is Accessible
**Category**: Negative  
**Priority**: P1  
**Preconditions**: User A is authenticated and has a booking  
**Steps**:
1. `GET /api/bookings/<UserA_own_booking_id>` using User A's token

**Expected Results**:
- HTTP 200 with booking data returned
- Self-access is permitted; only cross-user is blocked

**Business Rule**: BusinessRules §2 — users access their OWN bookings; isolation only cross-user  
**Suggested Layer**: API  
**Test Type**: SANITY

---

## Edge Cases

---

### TC-400: Simultaneous Login as Both Users in Different Browser Tabs
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Two browser tabs available  
**Steps**:
1. Login as User A in Tab 1
2. Login as User B in Tab 2 (shared localStorage may overwrite)
3. Attempt to access bookings in both tabs

**Expected Results**:
- The latest login token (User B) is in localStorage
- Tab 1 (User A) may experience session conflicts — document behavior
- No data cross-contamination between the two users

**Business Rule**: BusinessRules §2 — user session isolation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-401: Shared Static Event Has Independent Booking Records Per User
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Both User A and User B book the same static event  
**Steps**:
1. User A books "Tech Conference Bangalore" → gets Booking-A
2. User B books "Tech Conference Bangalore" → gets Booking-B

**Expected Results**:
- User A sees only Booking-A in their bookings list
- User B sees only Booking-B in their bookings list
- Neither user sees the other's booking
- Both bookings exist with distinct IDs

**Business Rule**: BusinessRules §2 — booking isolation even for shared static events  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-402: User A's Event FIFO Pruning Does Not Affect User B
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Both users have 6 dynamic events  
**Steps**:
1. User A creates a 7th event (FIFO prunes User A's oldest)
2. Check User B's event count

**Expected Results**:
- User B still has 6 events (unchanged)
- FIFO pruning is per-user

**Business Rule**: BusinessRules §3 — per-user FIFO; §2 sandbox  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-403: Long-Running Session Does Not Bleed Data Between Users
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Long test session with multiple logins  
**Steps**:
1. Login as User A; create 3 events; logout
2. Login as User B; create 3 events; verify only User B's events visible
3. Logout as User B; login as User A again

**Expected Results**:
- Each login shows only that user's data
- No data from previous sessions leaks into new sessions

**Business Rule**: BusinessRules §2 — session-based data isolation  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-404: Delete User A Account Does Not Delete User B's Data
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: User A and User B both have events and bookings  
**Steps**:
1. Delete User A's account (if the feature exists)
2. Login as User B and verify their data

**Expected Results**:
- User B's events and bookings remain intact
- Cascade deletion is scoped to User A only

**Business Rule**: BusinessRules §2 — deleting a user cascades to THEIR events/bookings only  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: "Access Denied" Page Displays Clearly Without Raw Error Details
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User navigates to another user's booking URL  
**Steps**:
1. Navigate to `/bookings/<cross_user_booking_id>`

**Expected Results**:
- Clean "Access Denied" message shown (not a raw JSON 403 response or stack trace)
- Navigation back to own bookings is available (e.g., "View My Bookings" link)

**Business Rule**: BusinessRules §2 — "Access Denied" message in UI  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-501: Bookings List Does Not Show Loader Indefinitely on 403
**Category**: UI State  
**Priority**: P2  
**Preconditions**: A 403 response is triggered  
**Steps**:
1. Navigate to a cross-user booking URL
2. Observe loading state transition

**Expected Results**:
- Loading spinner resolves to "Access Denied" message
- No infinite spinner or blank screen

**Business Rule**: UX robustness — error state handling  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-502: Admin Events Page Only Shows Current User's Events After Re-Login
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User A logged in; User B then logs in  
**Steps**:
1. Login as User A; navigate to `/admin/events`
2. Logout and login as User B; navigate to `/admin/events`

**Expected Results**:
- User B's admin page shows only User B's events
- No stale cached events from User A visible

**Business Rule**: BusinessRules §2 — admin view is user-scoped  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-503: Events Browse Page Only Shows User's Own Dynamic Events After Re-Login
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Both users have dynamic events  
**Steps**:
1. Login as User A; confirm their dynamic events visible
2. Logout and login as User B
3. Navigate to `/events`

**Expected Results**:
- User B's events page shows only: shared static events + User B's own dynamic events
- User A's dynamic events are NOT shown

**Business Rule**: BusinessRules §2 — user sandbox isolation on events browse  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

*End of Cross-User Security & Isolation Test Scenarios*
