import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { RegisterPage } from '../../pages/Authentication/RegisterPage';
import testData from '../../fixtures/Authentication/auth.data.json';

const { baseUrl, validUser, invalidUser, newUserRegistration } = testData;

test.describe('Authentication — Smoke Tests', () => {

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

      // -- Step 3: Assert error message is shown and user stays on login page --
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL(`${baseUrl}/login`);
      console.log(`Verified login error for: ${invalidUser.email}`);
    }
  );

});
