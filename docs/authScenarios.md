# EventHub Test Scenarios — Authentication

**Feature**: Authentication (Registration & Login)  
**Generated**: 2026-05-31  
**Domain Reference**: BusinessRules.md §1, API_Documentation.md §Authentication, UserFlows.md §Flow 1  

---

## Coverage Summary

| Lens | Scenarios | Range |
|------|-----------|-------|
| Happy Path | 6 | TC-001–006 |
| Business Rules | 8 | TC-100–107 |
| Security | 10 | TC-200–209 |
| Negative / Error | 10 | TC-300–309 |
| Edge Cases | 8 | TC-400–407 |
| UI State | 7 | TC-500–506 |

---

## Happy Path

---

### TC-001: Successful New User Registration
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: Email not previously registered; app is running  
**Steps**:
1. Navigate to `/register`
2. Enter a unique email (e.g., `newuser_<timestamp>@test.com`)
3. Enter a valid password with ≥ 6 characters (e.g., `Test@123`)
4. Click the **Register / Submit** button

**Expected Results**:
- HTTP 200/201 response with `{ token, user: { id, email } }`
- JWT token stored in localStorage
- User is redirected to the home page
- No error message is displayed

**Business Rule**: Flow 1 — Registration issues JWT on success  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-002: Successful Login with Valid Credentials
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: User account exists (`sumeetshah.tsk@gmail.com` / `Quinn0x@1`)  
**Steps**:
1. Navigate to `/login`
2. Enter email `sumeetshah.tsk@gmail.com`
3. Enter password `Quinn0x@1`
4. Click **Login**

**Expected Results**:
- HTTP 200 response with `{ token, user: { id, email } }`
- JWT stored in localStorage
- User redirected to home page
- No error messages visible

**Business Rule**: Flow 1 — Login issues JWT and redirects  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-003: JWT Token Contains Correct User Info
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Login with valid credentials
2. Call `GET /api/auth/me` with the received Bearer token

**Expected Results**:
- HTTP 200 response
- Body: `{ user: { userId, email } }` where `email` matches the login email
- `userId` is a non-empty value

**Business Rule**: API Reference — `/api/auth/me` returns current user  
**Suggested Layer**: API  
**Test Type**: SANITY

---

### TC-004: User Remains Logged In After Page Reload
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User has just logged in; JWT is in localStorage  
**Steps**:
1. Login successfully
2. Reload the page (F5)
3. Observe authentication state

**Expected Results**:
- User remains authenticated (not redirected to `/login`)
- Navigation reflects logged-in state (shows user email or logout option)

**Business Rule**: JWT persisted in localStorage survives reload  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-005: Successful Logout Clears Session
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: User is logged in  
**Steps**:
1. Click the **Logout** button / link
2. Attempt to navigate to a protected route (e.g., `/events`)
3. Observe redirect behavior

**Expected Results**:
- JWT is removed from localStorage
- User is redirected to `/login` when accessing protected routes
- No stale user data visible

**Business Rule**: Authenticated routes require valid JWT; missing token → 401 Unauthorized  
**Suggested Layer**: E2E  
**Test Type**: SANITY

---

### TC-006: Register Then Immediately Login with Same Credentials
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: Fresh unique email not in system  
**Steps**:
1. Register with `freshuser_<timestamp>@test.com` / `Test@123`
2. Logout (clear token from localStorage)
3. Login with the same email and password
4. Verify redirect and token

**Expected Results**:
- Both operations succeed
- User is authenticated after the login step
- Token returned on login is valid (confirmed by `/api/auth/me`)

**Business Rule**: Flow 1 — Registration creates account; login authenticates it  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

## Business Rules

---

### TC-100: Password Minimum Length Enforced (6 Characters)
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Registration page is open  
**Steps**:
1. Navigate to `/register`
2. Enter a unique email
3. Enter a 5-character password (e.g., `Ab@12`)
4. Submit the form

**Expected Results**:
- Registration is rejected
- Error message displayed indicating password must be at least 6 characters
- No JWT issued

**Business Rule**: UserFlows §Flow 1 — password min 6 chars  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-101: Email Must Be Unique — Duplicate Registration Rejected
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Account with `sumeetshah.tsk@gmail.com` already exists  
**Steps**:
1. Navigate to `/register`
2. Enter email `sumeetshah.tsk@gmail.com`
3. Enter any valid password
4. Submit the form

**Expected Results**:
- HTTP 409 response: `"Email already registered"`
- No new account or JWT created
- Error shown to user on the registration form

**Business Rule**: API Reference — Duplicate email → 409  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-102: JWT Required to Access Protected Endpoints
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: No token in localStorage / request headers  
**Steps**:
1. Call `GET /api/events` without Authorization header
2. Call `GET /api/bookings` without Authorization header

**Expected Results**:
- Both return HTTP 401: `"Unauthorized"`
- No event or booking data returned

**Business Rule**: API Reference — Events and Bookings require Bearer Token  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-103: Login with Correct Email But Wrong Password Returns 401
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Account `sumeetshah.tsk@gmail.com` exists  
**Steps**:
1. Navigate to `/login`
2. Enter `sumeetshah.tsk@gmail.com` as email
3. Enter `WrongPassword!` as password
4. Submit

**Expected Results**:
- HTTP 401: `"Invalid credentials"`
- No JWT issued
- Error message displayed on login form

**Business Rule**: API Reference — Invalid login credentials → 401  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-104: Registration Requires Both Email and Password Fields
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Registration page is open  
**Steps**:
1. Submit the registration form with only email (no password)
2. Submit the registration form with only password (no email)

**Expected Results**:
- Both submissions are rejected
- HTTP 400: validation error message for missing fields
- No JWT issued

**Business Rule**: API Reference — Missing required fields → 400 validation error  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-105: Login Requires Both Email and Password Fields
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Login page is open  
**Steps**:
1. Submit login form with email only (no password)
2. Submit login form with password only (no email)

**Expected Results**:
- Both submissions rejected with validation error
- No JWT issued or stored

**Business Rule**: API Reference — Missing required fields → 400  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-106: JWT Token Is Returned in Login Response Body
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Valid credentials available  
**Steps**:
1. POST to `/api/auth/login` with `{ email, password }`
2. Inspect the response body

**Expected Results**:
- Response body matches schema: `{ token: string, user: { id, email } }`
- `token` is a non-empty JWT string (three dot-separated parts)
- `user.email` matches the submitted email

**Business Rule**: API Reference — Login response schema  
**Suggested Layer**: API  
**Test Type**: SANITY

---

### TC-107: Registration Response Returns Token and User Object
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Unique email available  
**Steps**:
1. POST to `/api/auth/register` with `{ email, password }`
2. Inspect the response body

**Expected Results**:
- Response matches `{ token: string, user: { id, email } }`
- `token` is a valid JWT string
- `user.id` is populated (non-null/non-empty)
- `user.email` matches the registered email

**Business Rule**: API Reference — Register response schema  
**Suggested Layer**: API  
**Test Type**: SANITY

---

## Security

---

### TC-200: Accessing Protected Route Without JWT Redirects to Login
**Category**: Security  
**Priority**: P0  
**Preconditions**: User is logged out (no token in localStorage)  
**Steps**:
1. Directly navigate to `/events`
2. Directly navigate to `/bookings`
3. Directly navigate to `/admin/events`

**Expected Results**:
- User is redirected to `/login` for each protected route
- No protected content is exposed before authentication

**Business Rule**: API Reference — Missing auth token → 401  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-201: Expired or Tampered JWT Is Rejected
**Category**: Security  
**Priority**: P0  
**Preconditions**: User has an expired or manually altered token  
**Steps**:
1. Manually set an invalid/tampered token in localStorage (e.g., change last character)
2. Navigate to `/events`
3. Make API call to `GET /api/events` with the tampered token

**Expected Results**:
- API returns HTTP 401: `"Unauthorized"`
- UI redirects to `/login` or shows an unauthenticated state
- No data is returned for the tampered token

**Business Rule**: Bearer token required; invalid token → 401  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-202: SQL Injection in Login Email Field
**Category**: Security  
**Priority**: P0  
**Preconditions**: Login page is accessible  
**Steps**:
1. Navigate to `/login`
2. Enter `' OR '1'='1` as email
3. Enter any string as password
4. Submit

**Expected Results**:
- Login is rejected with HTTP 401 or 400 (invalid credentials / validation error)
- No authentication bypass occurs
- Application does not throw an unhandled error or expose DB details

**Business Rule**: Security best practice — inputs must be sanitized  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-203: SQL Injection in Password Field
**Category**: Security  
**Priority**: P0  
**Preconditions**: Login page is accessible  
**Steps**:
1. Navigate to `/login`
2. Enter a valid email
3. Enter `' OR '1'='1` as password
4. Submit

**Expected Results**:
- Login fails with appropriate error message
- No authentication bypass

**Business Rule**: Security best practice — password field sanitized  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-204: XSS Payload in Email Field During Registration
**Category**: Security  
**Priority**: P1  
**Preconditions**: Registration page accessible  
**Steps**:
1. Navigate to `/register`
2. Enter `<script>alert('xss')</script>@test.com` as email
3. Submit

**Expected Results**:
- Registration is rejected (invalid email format) OR payload is safely escaped
- No script executes in the browser
- No alert dialog appears

**Business Rule**: Security best practice — XSS prevention  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-205: Brute Force Attempt — Repeated Failed Logins
**Category**: Security  
**Priority**: P1  
**Preconditions**: Login page accessible  
**Steps**:
1. Attempt login with wrong password 10 consecutive times for the same email

**Expected Results**:
- Each attempt returns 401 `"Invalid credentials"`
- Application remains stable (no crash or data leakage)
- Ideally: rate limiting or lockout message appears after N failures

**Business Rule**: Security best practice; API Reference — 401 on invalid credentials  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-206: JWT Token Not Exposed in URL Parameters
**Category**: Security  
**Priority**: P1  
**Preconditions**: User logs in  
**Steps**:
1. Login and observe the redirect URL
2. Check browser address bar and network requests for token leakage in URL query strings

**Expected Results**:
- JWT token is NOT present in any URL query parameter
- Token is stored in localStorage only

**Business Rule**: Security best practice — tokens must not appear in URLs  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-207: Cross-User Token Isolation — User A's Token Cannot Access User B's Data
**Category**: Security  
**Priority**: P0  
**Preconditions**: Two user accounts exist  
**Steps**:
1. Login as User A; capture JWT token
2. Login as User B; capture User B booking ID
3. Use User A's token to call `GET /api/bookings/<userB_booking_id>`

**Expected Results**:
- HTTP 403: `"Forbidden"` or `"Access Denied"`
- User A's token cannot retrieve User B's booking

**Business Rule**: BusinessRules §2 — Cross-user access → 403 Forbidden  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-208: Registration Does Not Return Password in Response
**Category**: Security  
**Priority**: P1  
**Preconditions**: Registration endpoint accessible  
**Steps**:
1. POST to `/api/auth/register` with valid `{ email, password }`
2. Inspect the response body

**Expected Results**:
- Response body contains `{ token, user: { id, email } }`
- Password field is NOT present in the response
- Password is NOT echoed back in any form

**Business Rule**: Security best practice — never expose passwords in API responses  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-209: Login Does Not Return Password in Response
**Category**: Security  
**Priority**: P1  
**Preconditions**: Valid account exists  
**Steps**:
1. POST to `/api/auth/login` with `{ email, password }`
2. Inspect full response body and headers

**Expected Results**:
- Response body does not contain the password in plain text or any form
- Only `{ token, user: { id, email } }` is returned

**Business Rule**: Security best practice — API Reference login response schema  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Negative / Error

---

### TC-300: Login with Non-Existent Email
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Email `nonexistent_xyz@test.com` has never been registered  
**Steps**:
1. Navigate to `/login`
2. Enter `nonexistent_xyz@test.com` and `AnyPass@1`
3. Submit

**Expected Results**:
- HTTP 401: `"Invalid credentials"`
- No JWT issued
- Appropriate error message shown on UI (must NOT reveal whether the email exists)

**Business Rule**: API Reference — Invalid credentials → 401  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-301: Registration with Already-Used Email
**Category**: Negative  
**Priority**: P0  
**Preconditions**: `sumeetshah.tsk@gmail.com` is already registered  
**Steps**:
1. Attempt `POST /api/auth/register` with `{ email: "sumeetshah.tsk@gmail.com", password: "Quinn0x@1" }`

**Expected Results**:
- HTTP 409: `"Email already registered"`
- No duplicate user or new JWT created

**Business Rule**: API Reference — Duplicate email → 409  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-302: Login with Empty Email and Password
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Login page is open  
**Steps**:
1. Leave both email and password fields blank
2. Click Login

**Expected Results**:
- Form submission is prevented (client-side validation) or rejected by API
- Error messages displayed for empty fields
- No JWT issued

**Business Rule**: API Reference — Missing required fields → 400  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-303: Registration with Empty Email and Password
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Registration page is open  
**Steps**:
1. Leave both email and password blank
2. Submit

**Expected Results**:
- Rejected by client-side validation or API (400)
- Error messages shown for empty required fields

**Business Rule**: API Reference — Missing required fields → 400  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-304: Login with Password Below Minimum Length
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Login page is open  
**Steps**:
1. Enter a valid email
2. Enter `Ab@1` (4 characters) as password
3. Submit

**Expected Results**:
- Rejected (400 validation error or client-side error)
- Error: password must be at least 6 characters

**Business Rule**: UserFlows §Flow 1 — password min 6 chars  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-305: Calling /api/auth/me Without Token Returns 401
**Category**: Negative  
**Priority**: P1  
**Preconditions**: No Authorization header  
**Steps**:
1. `GET /api/auth/me` with no Bearer token

**Expected Results**:
- HTTP 401: `"Unauthorized"`
- No user object returned

**Business Rule**: API Reference — Missing auth token → 401  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-306: Login with Correct Password But Wrong Email Case (Case Sensitivity)
**Category**: Negative  
**Priority**: P2  
**Preconditions**: Account exists as `sumeetshah.tsk@gmail.com`  
**Steps**:
1. Attempt login with `SUMEETSHAH.TSK@GMAIL.COM` (all uppercase)
2. Use correct password `Quinn0x@1`

**Expected Results**:
- Observe whether email matching is case-insensitive or case-sensitive
- Document behavior: either succeeds (case-insensitive) or returns 401 (case-sensitive)
- No crash or unhandled exception

**Business Rule**: Email validation behavior — document actual behavior  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-307: Registration with Invalid Email Format
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Registration page accessible  
**Steps**:
1. Enter `notanemail` (no @ symbol) as email
2. Enter a valid password
3. Submit

**Expected Results**:
- Rejected with validation error (400 or client-side)
- Message indicates invalid email format
- No account created

**Business Rule**: API Reference — Missing required fields → 400 validation error details  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-308: Login with Special Characters in Password (Correct)
**Category**: Negative  
**Priority**: P2  
**Preconditions**: Account with password containing special characters exists  
**Steps**:
1. Register with password `P@$$w0rd!`
2. Login using the same password `P@$$w0rd!`
3. Login using wrong variant `P@$$w0rd` (missing `!`)

**Expected Results**:
- Step 2: Login succeeds
- Step 3: HTTP 401 `"Invalid credentials"` — passwords are exact-match verified

**Business Rule**: API Reference — Invalid credentials → 401  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-309: Protected API Rejects Request After Logout (Token Reuse)
**Category**: Negative  
**Priority**: P0  
**Preconditions**: User is logged in and then logs out  
**Steps**:
1. Login and capture the JWT token
2. Logout (token removed from localStorage)
3. Attempt `GET /api/events` using the previously captured token in Authorization header

**Expected Results**:
- If token is stateless JWT: API may still accept it until expiry (document behavior)
- If server maintains session/blacklist: HTTP 401 returned
- UI should redirect to login on logout regardless

**Business Rule**: Logout must invalidate client-side session at minimum  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## Edge Cases

---

### TC-400: Password Exactly 6 Characters (Boundary — Minimum Valid)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Registration page accessible  
**Steps**:
1. Register with a unique email and password `Ab@123` (exactly 6 characters)
2. Submit

**Expected Results**:
- Registration succeeds
- JWT returned, user redirected to home

**Business Rule**: UserFlows §Flow 1 — min 6 chars; 6 is the exact boundary  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-401: Password Exactly 5 Characters (Boundary — Just Below Minimum)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Registration page accessible  
**Steps**:
1. Enter a unique email and password `Ab@12` (exactly 5 characters)
2. Submit

**Expected Results**:
- Registration rejected
- Validation error: minimum 6 characters required

**Business Rule**: UserFlows §Flow 1 — password min 6 chars  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-402: Very Long Email Address (255 Characters)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Registration page accessible  
**Steps**:
1. Construct an email with 255 characters (e.g., `aaa...aaa@test.com`)
2. Register with valid password

**Expected Results**:
- Either accepted (if within DB/validation limit) or rejected with clear error
- No server crash or 500 error

**Business Rule**: Robustness — boundary value for email field length  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-403: Very Long Password (1000 Characters)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Registration page accessible  
**Steps**:
1. Submit registration with a 1000-character password

**Expected Results**:
- Accepted (bcrypt typically handles any length), OR
- Rejected with clear error message
- No server crash or 500 error

**Business Rule**: Robustness — boundary value for password field  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-404: Email with Subdomains and Plus Addressing
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Registration page accessible  
**Steps**:
1. Register with `user+tag@subdomain.test.com`
2. Login with the same address

**Expected Results**:
- If valid email format accepted: registration and login both succeed
- Consistent behavior (accepted or rejected) for both operations

**Business Rule**: Email validation — standard RFC email formats  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-405: Concurrent Duplicate Registration Requests (Race Condition)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Unique email available; API accessible  
**Steps**:
1. Fire two simultaneous POST requests to `/api/auth/register` with the same email

**Expected Results**:
- Only one registration succeeds (HTTP 201)
- The other returns HTTP 409 `"Email already registered"`
- No duplicate accounts created in the database

**Business Rule**: BusinessRules §2 — email uniqueness must be enforced atomically  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

### TC-406: Password Containing Only Spaces
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Registration page accessible  
**Steps**:
1. Enter a unique email
2. Enter `      ` (6 spaces) as password
3. Submit

**Expected Results**:
- Rejected with validation error (whitespace-only passwords should not be accepted)
- OR: Accepted but login with the same whitespace password also works (document behavior)

**Business Rule**: Input validation robustness  
**Suggested Layer**: E2E, API  
**Test Type**: REGRESSION

---

### TC-407: Login with Extra Whitespace Around Email
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Account `sumeetshah.tsk@gmail.com` exists  
**Steps**:
1. Login with `  sumeetshah.tsk@gmail.com  ` (leading/trailing spaces)
2. Use correct password

**Expected Results**:
- Either trims whitespace and authenticates successfully, OR
- Rejects with `"Invalid credentials"`
- Consistent behavior documented

**Business Rule**: Input sanitization — email trimming behavior  
**Suggested Layer**: API  
**Test Type**: REGRESSION

---

## UI State

---

### TC-500: Registration Form Shows Validation Errors Inline
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Registration page is open  
**Steps**:
1. Click **Submit** immediately without filling any fields

**Expected Results**:
- Inline validation messages appear below relevant fields (email, password)
- Form is not submitted to the server
- User is NOT navigated away from the registration page

**Business Rule**: UX best practice — immediate feedback for required fields  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-501: Login Form Shows Error Message on Failed Authentication
**Category**: UI State  
**Priority**: P0  
**Preconditions**: Login page is open; wrong credentials will be used  
**Steps**:
1. Enter `wrong@test.com` / `WrongPass@1`
2. Click **Login**
3. Observe the UI

**Expected Results**:
- Error message (e.g., `"Invalid credentials"`) appears in the UI
- User remains on the `/login` page
- No partial redirect or blank screen

**Business Rule**: API Reference — 401 error message displayed to user  
**Suggested Layer**: E2E  
**Test Type**: SMOKE

---

### TC-502: Loading/Submitting State Shown During Login API Call
**Category**: UI State  
**Priority**: P2  
**Preconditions**: Login page accessible  
**Steps**:
1. Throttle network to simulate slow connection (e.g., Chrome DevTools Slow 3G)
2. Submit valid login credentials
3. Observe the submit button and form state

**Expected Results**:
- Button shows a loading indicator (spinner or disabled state)
- Form fields are disabled during the API call
- No duplicate submission possible during loading

**Business Rule**: UX best practice — prevent double-submission  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-503: Redirect to Intended Page After Login
**Category**: UI State  
**Priority**: P1  
**Preconditions**: User is not authenticated  
**Steps**:
1. Navigate directly to `/bookings` while logged out
2. Get redirected to `/login`
3. Login with valid credentials

**Expected Results**:
- After login, user is redirected to `/bookings` (the originally intended page), OR
- Redirected to home page (document actual behavior)

**Business Rule**: UX best practice — preserve navigation intent post-login  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-504: Login Page Not Accessible When Already Logged In
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User is currently logged in  
**Steps**:
1. While logged in, navigate directly to `/login`

**Expected Results**:
- User is redirected to the home page OR the `/events` page
- Login form is NOT displayed to an already-authenticated user

**Business Rule**: UX best practice — avoid redundant login for authenticated users  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-505: Register Page Not Accessible When Already Logged In
**Category**: UI State  
**Priority**: P2  
**Preconditions**: User is currently logged in  
**Steps**:
1. While logged in, navigate directly to `/register`

**Expected Results**:
- User is redirected to home or events page
- Registration form is NOT displayed to an authenticated user

**Business Rule**: UX best practice — consistent auth guard behavior  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

### TC-506: Password Field Toggles Visibility
**Category**: UI State  
**Priority**: P2  
**Preconditions**: Login or Registration page is open  
**Steps**:
1. Type a password in the password field
2. Click the show/hide eye icon (if present)
3. Verify the password text visibility

**Expected Results**:
- Password initially shown as masked dots
- Toggle reveals the password as plain text
- Toggle again re-masks the password

**Business Rule**: UX best practice — password visibility toggle  
**Suggested Layer**: E2E  
**Test Type**: REGRESSION

---

*End of Authentication Test Scenarios*
