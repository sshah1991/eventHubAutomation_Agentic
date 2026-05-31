import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('CrossUserSecurityPage');

export class CrossUserSecurityPage {
  readonly page: Page;
  readonly accessDeniedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accessDeniedMessage = page.getByText(/access denied/i);
  }

  async gotoBookingDetail(baseUrl: string, bookingId: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/bookings/${bookingId}`);
    await this.page.goto(`${baseUrl}/bookings/${bookingId}`);
  }
}
