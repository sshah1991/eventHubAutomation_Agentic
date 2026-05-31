import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { RegisterPage } from '../../pages/Authentication/RegisterPage';
import testData from '../../fixtures/Authentication/auth.data.json';

const { baseUrl, apiUrl, validUser, invalidUser, newUserRegistration, shortPassword, protectedRoutes } = testData;

test.describe('Authentication', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    'TC-001: Successful new user registration',
    { tag: '@smoke' },
    async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const uniqueEmail = `${newUserRegistration.emailPrefix}${Date.now()}${newUserRegistration.emailDomain}`;

      // -- Step 1: Navigate to registration page --
      await registerPage.goto(baseUrl);

      // -- Step 2: Fill registration form with unique credentials --
      await registerPage.register(uniqueEmail, newUserRegistration.password);

      // -- Step 3: Assert successful registration and redirect to home --
      await expect(registerPage.logoutBtn).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/`);
      console.log(`Registered new user: ${uniqueEmail}`);
    }
  );

  test(
    'TC-002: Successful login with valid credentials',
    { tag: '@smoke' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      // -- Step 1: Navigate to login page --
      await loginPage.goto(baseUrl);

      // -- Step 2: Login with valid credentials --
      await loginPage.login(validUser.email, validUser.password);

      // -- Step 3: Assert successful login and redirect to home --
      await expect(loginPage.logoutBtn).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/`);
      await expect(page.getByText(validUser.email)).toBeVisible();
      console.log(`Logged in as: ${validUser.email}`);
    }
  );

  test(
    'TC-501: Login form shows error message on failed authentication',
    { tag: '@smoke' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      // -- Step 1: Navigate to login page --
      await loginPage.goto(baseUrl);

      // -- Step 2: Submit with invalid credentials --
      await loginPage.login(invalidUser.email, invalidUser.password);

      // -- Step 3: Assert error message shown and user stays on login page --
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/login`);
      console.log(`Verified login error for: ${invalidUser.email}`);
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    'TC-003: GET /api/auth/me returns correct user info for logged-in user',
    { tag: '@sanity' },
    async ({ request }) => {
      // -- Step 1: Login via API and capture token --
      const loginResponse = await request.post(`${apiUrl}/api/auth/login`, {
        data: { email: validUser.email, password: validUser.password },
      });
      expect(loginResponse.status()).toBe(200);
      const { token } = await loginResponse.json();

      // -- Step 2: Call GET /api/auth/me with the bearer token --
      const meResponse = await request.get(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(meResponse.status()).toBe(200);

      // -- Step 3: Assert response contains correct user data --
      const { user } = await meResponse.json();
      expect(user.userId).toBeTruthy();
      expect(user.email).toBe(validUser.email);
      console.log(`/api/auth/me returned userId: ${user.userId}, email: ${user.email}`);
    }
  );

  test(
    'TC-004: User remains authenticated after page reload',
    { tag: '@sanity' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      // -- Step 1: Login with valid credentials --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();

      // -- Step 2: Reload the page --
      await page.reload();

      // -- Step 3: Assert user is still authenticated after reload --
      await expect(loginPage.logoutBtn).toBeVisible();
      await expect(page.getByText(validUser.email)).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/`);
      console.log(`User ${validUser.email} remained authenticated after reload`);
    }
  );

  test(
    'TC-005: Logout clears session and protected routes redirect to login',
    { tag: '@sanity' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      // -- Step 1: Login and confirm authenticated state --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();

      // -- Step 2: Click Logout --
      await loginPage.logoutBtn.click();

      // -- Step 3: Navigate to a protected route --
      await page.goto(`${baseUrl}/events`);

      // -- Step 4: Assert redirected to login (session cleared) --
      await expect(page).toHaveURL(`${baseUrl}/login`);
      await expect(loginPage.logoutBtn).not.toBeVisible();
      console.log(`Logout confirmed: redirected to /login after accessing /events`);
    }
  );

  test(
    'TC-106: Login API response contains a valid JWT token and user object',
    { tag: '@sanity' },
    async ({ request }) => {
      // -- Step 1: POST to /api/auth/login --
      const response = await request.post(`${apiUrl}/api/auth/login`, {
        data: { email: validUser.email, password: validUser.password },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert response schema and JWT format --
      const body = await response.json();
      expect(body.token).toBeTruthy();
      expect(body.token.split('.')).toHaveLength(3);
      expect(body.user.id).toBeTruthy();
      expect(body.user.email).toBe(validUser.email);
      console.log(`Login response token (first 20 chars): ${body.token.substring(0, 20)}...`);
    }
  );

  test(
    'TC-107: Register API response contains a valid JWT token and user object',
    { tag: '@sanity' },
    async ({ request }) => {
      const uniqueEmail = `${newUserRegistration.emailPrefix}sanity_${Date.now()}${newUserRegistration.emailDomain}`;

      // -- Step 1: POST to /api/auth/register with unique email --
      const response = await request.post(`${apiUrl}/api/auth/register`, {
        data: { email: uniqueEmail, password: newUserRegistration.password },
      });
      expect(response.status()).toBe(201);

      // -- Step 2: Assert response schema and JWT format --
      const body = await response.json();
      expect(body.token).toBeTruthy();
      expect(body.token.split('.')).toHaveLength(3);
      expect(body.user.id).toBeTruthy();
      expect(body.user.email).toBe(uniqueEmail);
      console.log(`Registered ${uniqueEmail} — userId: ${body.user.id}`);
    }
  );

  // ── REGRESSION ───────────────────────────────────────────────────────────

  test(
    'TC-100: Registration rejected when password is below minimum length',
    { tag: '@regression' },
    async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const uniqueEmail = `${newUserRegistration.emailPrefix}tc100_${Date.now()}${newUserRegistration.emailDomain}`;

      // -- Step 1: Navigate to register and fill with short password --
      await registerPage.goto(baseUrl);
      await registerPage.emailInput.fill(uniqueEmail);
      await registerPage.passwordInput.fill(shortPassword);
      await registerPage.confirmPasswordInput.fill(shortPassword);
      await registerPage.registerBtn.click();

      // -- Step 2: Assert form was not submitted (still on register page) --
      await expect(page).toHaveURL(`${baseUrl}/register`);
      await expect(registerPage.logoutBtn).not.toBeVisible();
      console.log(`Confirmed: short password "${shortPassword}" rejected — stayed on /register`);
    }
  );

  test(
    'TC-101: Registration rejected with error when email is already registered',
    { tag: '@regression' },
    async ({ page }) => {
      const registerPage = new RegisterPage(page);

      // -- Step 1: Navigate to register with an already-registered email --
      await registerPage.goto(baseUrl);
      await registerPage.register(validUser.email, newUserRegistration.password);

      // -- Step 2: Assert error message shown and no redirect --
      await expect(registerPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/register`);
      console.log(`Confirmed: duplicate email "${validUser.email}" rejected with error`);
    }
  );

  test(
    'TC-102: Protected API endpoints return 401 when called without a JWT token',
    { tag: '@regression' },
    async ({ request }) => {
      // -- Step 1: Call GET /api/events without Authorization header --
      const eventsResponse = await request.get(`${apiUrl}/api/events`);
      expect(eventsResponse.status()).toBe(401);

      // -- Step 2: Call GET /api/bookings without Authorization header --
      const bookingsResponse = await request.get(`${apiUrl}/api/bookings`);
      expect(bookingsResponse.status()).toBe(401);

      console.log(`Confirmed: /api/events → ${eventsResponse.status()}, /api/bookings → ${bookingsResponse.status()} (no token)`);
    }
  );

  test(
    'TC-103: Login shows error when correct email is used with wrong password',
    { tag: '@regression' },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      // -- Step 1: Navigate to login and submit correct email + wrong password --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, invalidUser.password);

      // -- Step 2: Assert error message shown and no redirect --
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/login`);
      await expect(loginPage.logoutBtn).not.toBeVisible();
      console.log(`Confirmed: correct email + wrong password rejected for "${validUser.email}"`);
    }
  );

  test(
    'TC-200: Accessing protected routes without JWT redirects to login',
    { tag: '@regression' },
    async ({ page }) => {
      // -- Step 1: Attempt each protected route without authentication --
      for (const route of protectedRoutes) {
        await page.goto(`${baseUrl}${route}`);

        // -- Step 2: Assert redirect to /login for each protected route --
        await expect(page).toHaveURL(`${baseUrl}/login`);
        console.log(`Confirmed: ${route} → redirected to /login`);
      }
    }
  );

});
