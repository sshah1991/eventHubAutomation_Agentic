import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('AdminEventPage');

export interface EventFormData {
  title: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  price: number;
  totalSeats: number;
}

export class AdminEventPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly categorySelect: Locator;
  readonly cityInput: Locator;
  readonly venueInput: Locator;
  readonly dateInput: Locator;
  readonly priceInput: Locator;
  readonly totalSeatsInput: Locator;
  readonly createBtn: Locator;
  readonly updateBtn: Locator;
  readonly successToast: Locator;
  readonly updateSuccessToast: Locator;
  readonly logoutBtn: Locator;
  readonly cancelDeleteDialogBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('#event-title-input');
    this.categorySelect = page.locator('#category');
    this.cityInput = page.locator('#city');
    this.venueInput = page.locator('#venue');
    this.dateInput = page.locator('[id="event-date-&-time"]');
    this.priceInput = page.locator('[id="price-($)"]');
    this.totalSeatsInput = page.locator('#total-seats');
    this.createBtn = page.locator('#add-event-btn');
    this.updateBtn = page.getByRole('button', { name: /update event/i });
    this.successToast = page.getByText('Event created!');
    this.updateSuccessToast = page.getByText(/event updated/i);
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
    this.cancelDeleteDialogBtn = page.getByRole('button', { name: 'Cancel' });
  }

  async goto(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/admin/events`);
    await this.page.goto(`${baseUrl}/admin/events`);
  }

  getEventRow(title: string): Locator {
    return this.page.getByTestId('event-table-row').filter({ hasText: title }).first();
  }

  async fillCreateForm(event: EventFormData): Promise<void> {
    log.info(`Filling create form: "${event.title}"`);
    await this.titleInput.fill(event.title);
    await this.categorySelect.selectOption(event.category);
    await this.cityInput.fill(event.city);
    await this.venueInput.fill(event.venue);
    // datetime-local inputs require "YYYY-MM-DDTHH:MM" format
    const datetimeValue = event.date.includes('T') ? event.date.slice(0, 16) : `${event.date}T00:00`;
    await this.dateInput.fill(datetimeValue);
    await this.priceInput.fill(String(event.price));
    await this.totalSeatsInput.fill(String(event.totalSeats));
  }

  async createEvent(event: EventFormData): Promise<void> {
    await this.fillCreateForm(event);
    await this.createBtn.click();
  }

  async clickEditForEvent(title: string): Promise<void> {
    log.info(`Clicking Edit for: "${title}"`);
    await this.getEventRow(title).getByRole('button', { name: /edit/i }).click();
  }

  async clickDeleteForEvent(title: string): Promise<void> {
    log.info(`Clicking Delete for: "${title}"`);
    await this.getEventRow(title).getByRole('button', { name: /delete/i }).click();
    // Confirm deletion in the React modal ("Delete event" button)
    await this.page.getByRole('button', { name: 'Delete event' }).click();
  }

  async clickDeleteThenCancelForEvent(title: string): Promise<void> {
    log.info(`Clicking Delete then cancelling for: "${title}"`);
    await this.getEventRow(title).getByRole('button', { name: /delete/i }).click();
    await this.cancelDeleteDialogBtn.click();
  }

  async fillUpdateForm(updates: Partial<EventFormData>): Promise<void> {
    log.info('Filling update form');
    if (updates.title !== undefined) {
      await this.titleInput.clear();
      await this.titleInput.fill(updates.title);
    }
    if (updates.venue !== undefined) {
      await this.venueInput.clear();
      await this.venueInput.fill(updates.venue);
    }
    if (updates.price !== undefined) {
      await this.priceInput.clear();
      await this.priceInput.fill(String(updates.price));
    }
    if (updates.totalSeats !== undefined) {
      await this.totalSeatsInput.clear();
      await this.totalSeatsInput.fill(String(updates.totalSeats));
    }
  }

  async updateEvent(updates: Partial<EventFormData>): Promise<void> {
    await this.fillUpdateForm(updates);
    await this.updateBtn.click();
  }
}
