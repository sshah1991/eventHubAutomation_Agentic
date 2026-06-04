import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('EventDetailPage');

export class EventDetailPage {
  readonly page: Page;
  readonly confirmBookingBtn: Locator;
  readonly qtyIncreaseBtn: Locator;
  readonly qtyDecreaseBtn: Locator;
  readonly logoutBtn: Locator;
  readonly availableSeatsText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmBookingBtn = page.getByRole('button', { name: /confirm booking/i });
    this.qtyIncreaseBtn = page.getByRole('button', { name: '+' });
    this.qtyDecreaseBtn = page.getByRole('button', { name: '-' });
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
    this.availableSeatsText = page.getByText(/\d+ \/ \d+ seats/);
  }

  async goto(baseUrl: string, eventId: number): Promise<void> {
    log.info(`Navigating to ${baseUrl}/events/${eventId}`);
    await this.page.goto(`${baseUrl}/events/${eventId}`);
  }
}
