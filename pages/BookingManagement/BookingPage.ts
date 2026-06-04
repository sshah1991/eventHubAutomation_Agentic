import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('BookingPage');

export interface BookingFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity?: number;
}

export class BookingPage {
  readonly page: Page;

  // Event detail — quantity controls
  readonly qtyIncreaseBtn: Locator;
  readonly qtyDecreaseBtn: Locator;
  readonly quantityDisplay: Locator;

  // Event detail — customer booking form
  readonly customerNameInput: Locator;
  readonly customerEmailInput: Locator;
  readonly customerPhoneInput: Locator;
  readonly confirmBookingBtn: Locator;

  // Post-booking confirmation card
  readonly viewMyBookingsLink: Locator;
  readonly browseEventsLink: Locator;

  // /bookings list page
  readonly clearAllBtn: Locator;
  readonly emptyStateText: Locator;

  // /bookings list page — sandbox warning banner (appears near the 9-booking limit)
  readonly sandboxWarningBanner: Locator;

  // /bookings/:id detail page
  readonly cancelBookingBtn: Locator;
  readonly checkRefundBtn: Locator;
  readonly refundResultMsg: Locator;

  constructor(page: Page) {
    this.page = page;

    // Quantity selector (event detail page)
    this.qtyIncreaseBtn = page.getByRole('button', { name: '+' });
    this.qtyDecreaseBtn = page.getByRole('button', { name: '−' });
    this.quantityDisplay = page.locator('#ticket-count');

    // Customer booking form (labels: "Full Name *", "Email *", "Phone Number *")
    this.customerNameInput = page.getByPlaceholder('Your full name');
    this.customerEmailInput = page.getByPlaceholder('you@email.com');
    this.customerPhoneInput = page.getByLabel(/phone number/i);
    this.confirmBookingBtn = page.getByRole('button', { name: /confirm booking/i });

    // Post-booking confirmation navigation
    this.viewMyBookingsLink = page.getByRole('link', { name: /view my bookings/i });
    this.browseEventsLink = page.getByRole('link', { name: /browse events/i });

    // Bookings list (/bookings)
    this.clearAllBtn = page.getByRole('button', { name: /clear all bookings/i });
    this.emptyStateText = page.getByText(/no bookings yet/i);

    // Bookings list — sandbox warning banner
    this.sandboxWarningBanner = page.getByText(/sandbox holds up to/i);

    // Booking detail (/bookings/:id)
    this.cancelBookingBtn = page.getByRole('button', { name: /cancel booking/i });
    this.checkRefundBtn = page.getByRole('button', { name: /check eligibility/i });
    this.refundResultMsg = page.getByTestId('refund-result');
  }

  async gotoEventDetail(baseUrl: string, eventId: number): Promise<void> {
    log.info(`Navigating to ${baseUrl}/events/${eventId}`);
    await this.page.goto(`${baseUrl}/events/${eventId}`);
  }

  async gotoBookings(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/bookings`);
    await this.page.goto(`${baseUrl}/bookings`);
  }

  async gotoBookingDetail(baseUrl: string, bookingId: number | string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/bookings/${bookingId}`);
    await this.page.goto(`${baseUrl}/bookings/${bookingId}`);
  }

  async setQuantity(targetQty: number): Promise<void> {
    log.info(`Setting quantity to ${targetQty}`);
    for (let i = 1; i < targetQty; i++) {
      await this.qtyIncreaseBtn.click();
    }
  }

  async fillAndConfirmBooking(data: BookingFormData): Promise<void> {
    log.info(`Filling booking form for: "${data.customerName}"`);
    if (data.quantity && data.quantity > 1) {
      await this.setQuantity(data.quantity);
    }
    await this.customerNameInput.fill(data.customerName);
    await this.customerEmailInput.fill(data.customerEmail);
    await this.customerPhoneInput.fill(data.customerPhone);
    await this.confirmBookingBtn.click();
  }

  getBookingRefLocator(): Locator {
    // Matches booking reference format: X-XXXXXX anywhere on the confirmation page
    return this.page.getByText(/\b[A-Z]-[A-Z0-9]{6}\b/).first();
  }

  getBookingCard(bookingRef: string): Locator {
    return this.page.getByTestId('booking-card').filter({ hasText: bookingRef });
  }

  getViewDetailsLink(bookingRef: string): Locator {
    return this.page
      .getByTestId('booking-card')
      .filter({ hasText: bookingRef })
      .getByRole('link', { name: /view details/i });
  }
}
