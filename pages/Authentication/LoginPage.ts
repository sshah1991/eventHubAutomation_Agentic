import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('LoginPage');

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginBtn: Locator;
  readonly errorMessage: Locator;
  readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder('you@email.com');
    this.passwordInput = page.getByLabel('Password');
    this.loginBtn = page.locator('#login-btn');
    this.errorMessage = page.getByRole('alert');
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
  }

  async goto(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/login`);
    await this.page.goto(`${baseUrl}/login`);
  }

  async login(email: string, password: string): Promise<void> {
    log.info(`Submitting login form for: ${email}`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }
}
