import { Page, Locator } from '@playwright/test';
import { createLogger } from '../../utils/logger';

const log = createLogger('EventsPage');

export class EventsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly categorySelect: Locator;
  readonly citySelect: Locator;
  readonly eventCards: Locator;
  readonly bookNowBtns: Locator;
  readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search/i);
    // Category is the first <select> (no label in DOM), city is the second
    this.categorySelect = page.locator('select').first();
    this.citySelect = page.locator('select').nth(1);
    this.eventCards = page.getByTestId('event-card');
    // "Book Now" renders as an <a> link, not a <button>
    this.bookNowBtns = page.getByRole('link', { name: /book now/i });
    this.logoutBtn = page.getByRole('button', { name: 'Logout' });
  }

  async goto(baseUrl: string): Promise<void> {
    log.info(`Navigating to ${baseUrl}/events`);
    await this.page.goto(`${baseUrl}/events`);
  }

  async search(keyword: string): Promise<void> {
    log.info(`Searching for: "${keyword}"`);
    await this.searchInput.fill(keyword);
  }

  async filterByCategory(category: string): Promise<void> {
    log.info(`Filtering by category: "${category}"`);
    await this.categorySelect.selectOption(category);
  }

  async filterByCity(city: string): Promise<void> {
    log.info(`Filtering by city: "${city}"`);
    await this.citySelect.selectOption(city);
  }

  getEventCard(title: string): Locator {
    return this.page.getByTestId('event-card').filter({ hasText: title }).first();
  }

  getBookNowFor(cardTitle: string): Locator {
    return this.page
      .getByTestId('event-card')
      .filter({ hasText: cardTitle })
      .getByRole('link', { name: /book now/i });
  }
}
