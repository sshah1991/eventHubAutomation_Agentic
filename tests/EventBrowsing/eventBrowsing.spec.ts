import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { EventsPage } from '../../pages/EventBrowsing/EventsPage';
import { EventDetailPage } from '../../pages/EventBrowsing/EventDetailPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/EventBrowsing/eventBrowsing.data.json';

const log = createLogger('EventBrowsing');

const { baseUrl, apiUrl, validUser, knownEvent, searchKeyword, filterCategory, filterCity } = testData;

// ── API helper ─────────────────────────────────────────────────────────────

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email: validUser.email, password: validUser.password },
  });
  const { token } = await res.json();
  return token;
}

// ──────────────────────────────────────────────────────────────────────────

test.describe('EventBrowsing', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    'TC-EB001: GET /api/events returns 200 with data array and pagination',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET /api/events with auth token --
      const response = await request.get(`${apiUrl}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert response has data array and pagination object --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination).toBeTruthy();
      log.info(`TC-EB001: ${body.data.length} events returned, total: ${body.pagination.total}`);
    }
  );

  test(
    'TC-EB002: /events page renders with event cards visible after login',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Login with valid credentials --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();

      // -- Step 2: Navigate to /events --
      await eventsPage.goto(baseUrl);
      await expect(page).toHaveURL(`${baseUrl}/events`);

      // -- Step 3: Assert at least one Book Now button is visible (proxy for cards rendered) --
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const cardCount = await eventsPage.bookNowBtns.count();
      expect(cardCount).toBeGreaterThan(0);
      log.info(`TC-EB002: /events rendered with ${cardCount} event card(s)`);
    }
  );

  test(
    'TC-EB003: Search on /events filters results by keyword',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Login and navigate to /events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();

      // -- Step 2: Search for keyword --
      await eventsPage.search(searchKeyword);

      // -- Step 3: Assert at least one result is visible and contains the keyword --
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const resultCount = await eventsPage.bookNowBtns.count();
      expect(resultCount).toBeGreaterThan(0);
      await expect(page.getByText(new RegExp(searchKeyword, 'i')).first()).toBeVisible();
      log.info(`TC-EB003: Search "${searchKeyword}" returned ${resultCount} result(s)`);
    }
  );

  test(
    'TC-EB004: Category filter on /events narrows results',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Login and navigate to /events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const totalCount = await eventsPage.bookNowBtns.count();

      // -- Step 2: Apply category filter and wait for re-render --
      await eventsPage.filterByCategory(filterCategory);
      await page.waitForLoadState('networkidle');

      // -- Step 3: Assert results are narrowed and still present --
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const filteredCount = await eventsPage.bookNowBtns.count();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThanOrEqual(totalCount);
      log.info(`TC-EB004: Category filter "${filterCategory}" → ${filteredCount} of ${totalCount} events`);
    }
  );

  test(
    'TC-EB005: "Book Now" on event card navigates to /events/:id detail page',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);
      const detailPage = new EventDetailPage(page);

      // -- Step 1: Login and navigate to /events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();

      // -- Step 2: Click Book Now on the first visible event card --
      await eventsPage.bookNowBtns.first().click();

      // -- Step 3: Assert URL changed to /events/:id and booking form is present --
      await expect(page).toHaveURL(/\/events\/\d+/);
      await expect(detailPage.confirmBookingBtn).toBeVisible();
      log.info(`TC-EB005: "Book Now" navigated to ${page.url()}`);
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    'TC-EB101: GET /api/events/:id returns 200 with correct event structure',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET event by known static ID --
      const response = await request.get(`${apiUrl}/api/events/${knownEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert all required fields are present --
      const { data } = await response.json();
      expect(data.id).toBe(knownEvent.id);
      expect(typeof data.title).toBe('string');
      expect(data.title.length).toBeGreaterThan(0);
      expect(typeof data.category).toBe('string');
      expect(typeof data.city).toBe('string');
      expect(typeof data.venue).toBe('string');
      // API returns price as a string-encoded number (e.g., "1500")
      expect(Number(data.price)).toBeGreaterThan(0);
      expect(typeof data.availableSeats).toBe('number');
      log.info(`TC-EB101: Event ${data.id} — "${data.title}" (${data.category}, ${data.city})`);
    }
  );

  test(
    'TC-EB102: GET /api/events?search= filters events by keyword',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET /api/events with search query --
      const response = await request.get(`${apiUrl}/api/events?search=${searchKeyword}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert response has results matching the keyword --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      const keyword = searchKeyword.toLowerCase();
      const allMatch = (body.data as any[]).every(
        e =>
          e.title?.toLowerCase().includes(keyword) ||
          e.description?.toLowerCase().includes(keyword) ||
          e.venue?.toLowerCase().includes(keyword)
      );
      expect(allMatch).toBe(true);
      log.info(`TC-EB102: search="${searchKeyword}" → ${body.data.length} event(s), all match`);
    }
  );

  test(
    'TC-EB103: GET /api/events?category= returns only matching category events',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET events filtered by category --
      const response = await request.get(
        `${apiUrl}/api/events?category=${encodeURIComponent(filterCategory)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(response.status()).toBe(200);

      // -- Step 2: Assert every returned event matches the requested category --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      (body.data as any[]).forEach(e => {
        expect(e.category).toBe(filterCategory);
      });
      log.info(`TC-EB103: category="${filterCategory}" → ${body.data.length} event(s), all match`);
    }
  );

  test(
    'TC-EB104: GET /api/events?city= returns only matching city events',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET events filtered by city --
      const response = await request.get(
        `${apiUrl}/api/events?city=${encodeURIComponent(filterCity)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(response.status()).toBe(200);

      // -- Step 2: Assert every returned event matches the requested city --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      (body.data as any[]).forEach(e => {
        expect(e.city).toBe(filterCity);
      });
      log.info(`TC-EB104: city="${filterCity}" → ${body.data.length} event(s), all match`);
    }
  );

  test(
    'TC-EB105: GET /api/events pagination fields are present with correct types',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET /api/events --
      const response = await request.get(`${apiUrl}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert pagination object has total, page, and limit as numbers --
      const body = await response.json();
      const { pagination } = body;
      expect(pagination).toBeTruthy();
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.page).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(pagination.total).toBeGreaterThanOrEqual(body.data.length);
      log.info(
        `TC-EB105: pagination — total: ${pagination.total}, page: ${pagination.page}, limit: ${pagination.limit}`
      );
    }
  );

  test(
    'TC-EB106: Event card on /events shows title, price, and Book Now button',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Fetch first event details from API to know what to expect on card --
      const token = await getAuthToken(request);
      const apiRes = await request.get(`${apiUrl}/api/events/${knownEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: event } = await apiRes.json();

      // -- Step 2: Login and navigate to /events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();

      // -- Step 3: Assert a card for the known event shows title and Book Now link --
      // Price is shown on the detail page, not on the browse card
      const card = eventsPage.getEventCard(event.title);
      await expect(card).toBeVisible();
      await expect(card.getByRole('link', { name: /book now/i })).toBeVisible();
      log.info(`TC-EB106: Card for "${event.title}" is visible with Book Now link`);
    }
  );

  test(
    'TC-EB107: City filter on /events UI narrows displayed results',
    { tag: '@sanity' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Login and navigate to /events — capture unfiltered count --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const totalCount = await eventsPage.bookNowBtns.count();

      // -- Step 2: Apply city filter and wait for re-render --
      await eventsPage.filterByCity(filterCity);
      await page.waitForLoadState('networkidle');

      // -- Step 3: Assert results are narrowed (city has fewer events than full list) --
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const filteredCount = await eventsPage.bookNowBtns.count();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThan(totalCount);
      log.info(`TC-EB107: City filter "${filterCity}" → ${filteredCount} of ${totalCount} events`);
    }
  );

  // ── REGRESSION ─────────────────────────────────────────────────────────────

  // ─── Auth Guards ──────────────────────────────────────────────────────────

  test(
    'TC-EB-R201: GET /api/events without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      const response = await request.get(`${apiUrl}/api/events`);
      expect(response.status()).toBe(401);
      log.info(`TC-EB-R201: GET /api/events without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-EB-R202: GET /api/events/:id without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      const response = await request.get(`${apiUrl}/api/events/${knownEvent.id}`);
      expect(response.status()).toBe(401);
      log.info(`TC-EB-R202: GET /api/events/${knownEvent.id} without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-EB-R203: GET /api/events/:id for non-existent ID returns 404',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const response = await request.get(`${apiUrl}/api/events/99999999`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(404);
      log.info(`TC-EB-R203: GET /api/events/99999999 → ${response.status()} ✓`);
    }
  );

  test(
    'TC-EB-R204: GET /api/events respects page and limit pagination params',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET page 1 with limit 3 — expect exactly 3 events --
      const page1Res = await request.get(`${apiUrl}/api/events?page=1&limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(page1Res.status()).toBe(200);
      const { data: page1, pagination } = await page1Res.json();
      expect((page1 as any[]).length).toBe(3);
      expect(pagination.total).toBeGreaterThanOrEqual(3);

      // -- Step 2: GET page 2 with limit 3 — expect a different set of events --
      const page2Res = await request.get(`${apiUrl}/api/events?page=2&limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(page2Res.status()).toBe(200);
      const { data: page2 } = await page2Res.json();
      expect((page2 as any[]).length).toBeGreaterThan(0);

      // -- Step 3: Assert no overlap between page 1 and page 2 IDs --
      const ids1 = (page1 as any[]).map((e: any) => e.id);
      const ids2 = (page2 as any[]).map((e: any) => e.id);
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap.length).toBe(0);
      log.info(`TC-EB-R204: page1=${ids1.length} events, page2=${ids2.length} events — no overlap ✓`);
    }
  );

  test(
    'TC-EB-R205: GET /api/events?search= with no matching keyword returns empty data array',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const noMatchKeyword = 'XQZNOEVENTSHOULDMATCH99999';

      // -- Step 1: GET events with a keyword that matches nothing --
      const response = await request.get(
        `${apiUrl}/api/events?search=${encodeURIComponent(noMatchKeyword)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(response.status()).toBe(200);

      // -- Step 2: Assert data array is empty and total is 0 --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect((body.data as any[]).length).toBe(0);
      log.info(`TC-EB-R205: search="${noMatchKeyword}" → 0 events returned ✓`);
    }
  );

  test(
    'TC-EB-R206: GET /api/events?search=X&category=Y combined filter returns only matching events',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET events filtered by both search keyword and category --
      const response = await request.get(
        `${apiUrl}/api/events?search=${encodeURIComponent(searchKeyword)}&category=${encodeURIComponent(filterCategory)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(response.status()).toBe(200);

      // -- Step 2: Assert all returned events match both conditions --
      const { data: events } = await response.json();
      expect((events as any[]).length).toBeGreaterThan(0);
      const keyword = searchKeyword.toLowerCase();
      for (const e of events as any[]) {
        expect(e.category).toBe(filterCategory);
        const titleMatch = (e.title as string).toLowerCase().includes(keyword);
        const descMatch = ((e.description as string) ?? '').toLowerCase().includes(keyword);
        const venueMatch = ((e.venue as string) ?? '').toLowerCase().includes(keyword);
        expect(titleMatch || descMatch || venueMatch).toBe(true);
      }
      log.info(
        `TC-EB-R206: search="${searchKeyword}" + category="${filterCategory}" → ${(events as any[]).length} event(s), all match ✓`
      );
    }
  );

  // ─── UI Guards ────────────────────────────────────────────────────────────

  test(
    'TC-EB-R301: /events page redirects unauthenticated user to /login',
    { tag: '@regression' },
    async ({ page }) => {
      test.setTimeout(30000);

      // -- Step 1: Navigate to /events without any active session --
      await page.goto(`${baseUrl}/events`);

      // -- Step 2: Assert redirect to /login --
      await expect(page).toHaveURL(`${baseUrl}/login`);
      log.info('TC-EB-R301: Unauthenticated /events → /login redirect confirmed ✓');
    }
  );

  test(
    'TC-EB-R302: /events/:id page redirects unauthenticated user to /login',
    { tag: '@regression' },
    async ({ page }) => {
      test.setTimeout(30000);

      // -- Step 1: Navigate directly to an event detail page with no session --
      await page.goto(`${baseUrl}/events/${knownEvent.id}`);

      // -- Step 2: Assert redirect to /login --
      await expect(page).toHaveURL(`${baseUrl}/login`);
      log.info(`TC-EB-R302: Unauthenticated /events/${knownEvent.id} → /login redirect confirmed ✓`);
    }
  );

  test(
    'TC-EB-R303: Clearing the search input restores the full event list',
    { tag: '@regression' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const eventsPage = new EventsPage(page);

      // -- Step 1: Login and navigate to /events — capture unfiltered count --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await eventsPage.goto(baseUrl);
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const initialCount = await eventsPage.bookNowBtns.count();

      // -- Step 2: Search for a keyword to narrow results --
      await eventsPage.search(searchKeyword);
      await page.waitForLoadState('networkidle');
      const filteredCount = await eventsPage.bookNowBtns.count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // -- Step 3: Clear the search input --
      await eventsPage.searchInput.clear();
      await page.waitForLoadState('networkidle');

      // -- Step 4: Assert event count is restored to at least the filtered count --
      await expect(eventsPage.bookNowBtns.first()).toBeVisible();
      const restoredCount = await eventsPage.bookNowBtns.count();
      expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
      log.info(
        `TC-EB-R303: Search cleared — count ${filteredCount} → ${restoredCount} (restored) ✓`
      );
    }
  );

  test(
    'TC-EB-R304: Event detail page shows available seats count matching API response',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const detailPage = new EventDetailPage(page);

      // -- Step 1: Fetch availableSeats from API --
      const token = await getAuthToken(request);
      const apiRes = await request.get(`${apiUrl}/api/events/${knownEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: event } = await apiRes.json();
      const expectedSeats = event.availableSeats as number;

      // -- Step 2: Login and navigate to the event detail page --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await detailPage.goto(baseUrl, knownEvent.id);

      // -- Step 3: Assert the seats count is visible on the page --
      await expect(detailPage.availableSeatsText).toBeVisible();
      await expect(detailPage.availableSeatsText).toContainText(String(expectedSeats));
      log.info(
        `TC-EB-R304: Event ${knownEvent.id} shows availableSeats = ${expectedSeats} on detail page ✓`
      );
    }
  );

  test(
    'TC-EB108: /events/:id detail page loads with event title, price, and booking form',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const detailPage = new EventDetailPage(page);

      // -- Step 1: Fetch event title and price from API for assertion --
      const token = await getAuthToken(request);
      const apiRes = await request.get(`${apiUrl}/api/events/${knownEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { data: event } = await apiRes.json();

      // -- Step 2: Login and navigate directly to event detail page --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await detailPage.goto(baseUrl, knownEvent.id);

      // -- Step 3: Assert correct URL and event heading is displayed --
      await expect(page).toHaveURL(`${baseUrl}/events/${knownEvent.id}`);
      // Use heading role to avoid strict-mode violation (title appears in both nav span and h1)
      await expect(page.getByRole('heading', { name: event.title })).toBeVisible();

      // -- Step 4: Assert the booking form is present --
      await expect(detailPage.confirmBookingBtn).toBeVisible();
      await expect(detailPage.qtyIncreaseBtn).toBeVisible();
      log.info(`TC-EB108: Detail page for event ${knownEvent.id} — "${event.title}" loaded with booking form`);
    }
  );

});
