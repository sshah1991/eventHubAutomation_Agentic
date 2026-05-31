import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('RegisterPage');

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerBtn: Locator;
  readonly logoutBtn: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder('you@email.com');
    this.passwordInput = page.getByPlaceholder('Min 8 chars, uppercase, number & symbol');
    this.confirmPasswordInput = page.getByPlaceholder('Repeat your password');
    this.registerBtn = page.getByRole('button', { name: 'Create Account' });
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/register`);
    await this.page.goto(`${baseUrl}/register`);
  }

  async register(email: string, password: string): Promise<void> {
    log.info(`Submitting registration form for: ${email}`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.registerBtn.click();
  }
}
