import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import testData from '../../fixtures/Authentication/auth.data.json';

const { baseUrl, apiUrl, validUser, newUserRegistration } = testData;

test.describe('Authentication — Sanity Tests', () => {

  // ── TC-003: JWT Token Contains Correct User Info ──────────────────────────
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

  // ── TC-004: User Remains Logged In After Page Reload ─────────────────────
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

  // ── TC-005: Successful Logout Clears Session ──────────────────────────────
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

  // ── TC-106: JWT Token Is Returned in Login Response Body ──────────────────
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

  // ── TC-107: Registration Response Returns Token and User Object ───────────
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

});
