import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('SandboxPage');

export class SandboxPage {
  readonly page: Page;

  // Amber info banner on /events — always visible, contains both limits
  readonly eventsBanner: Locator;

  // Amber info banner on /admin/events — always visible, mentions 6-event limit
  readonly adminEventsBanner: Locator;

  readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.eventsBanner = page.getByText(/sandbox holds up to/i);
    this.adminEventsBanner = page.getByText(/you can add up to/i);
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
  }

  async gotoEvents(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/events`);
    await this.page.goto(`${baseUrl}/events`);
  }

  async gotoAdminEvents(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/admin/events`);
    await this.page.goto(`${baseUrl}/admin/events`);
  }

  async gotoBookings(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/bookings`);
    await this.page.goto(`${baseUrl}/bookings`);
  }
}
