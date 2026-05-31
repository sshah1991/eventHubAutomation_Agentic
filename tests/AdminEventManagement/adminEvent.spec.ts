import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { AdminEventPage } from '../../pages/AdminEventManagement/AdminEventPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/AdminEventManagement/adminEvent.data.json';

const log = createLogger('AdminEventManagement');

const { baseUrl, apiUrl, validUser, newEvent, updatedEvent, staticEvent } = testData;

// ── API helpers ────────────────────────────────────────────────────────────

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email: validUser.email, password: validUser.password },
  });
  const { token } = await res.json();
  return token;
}

async function createEventViaApi(
  request: APIRequestContext,
  token: string,
  overrides: Partial<typeof newEvent> = {}
): Promise<number> {
  const res = await request.post(`${apiUrl}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...newEvent, ...overrides },
  });
  const { data } = await res.json();
  return data.id as number;
}

async function deleteEventViaApi(
  request: APIRequestContext,
  token: string,
  eventId: number
): Promise<void> {
  await request.delete(`${apiUrl}/api/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ──────────────────────────────────────────────────────────────────────────

test.describe('AdminEventManagement', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    'TC-E001: Create a new event via Admin UI — toast shown and event visible in list',
    { tag: '@smoke' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const adminPage = new AdminEventPage(page);
      const uniqueTitle = `${newEvent.title} ${Date.now()}`;

      try {
        // -- Step 1: Login and navigate to Admin Events --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await adminPage.goto(baseUrl);

        // -- Step 2: Fill and submit the create event form --
        await adminPage.createEvent({ ...newEvent, title: uniqueTitle });

        // -- Step 3: Assert "Event created!" toast appears --
        await expect(adminPage.successToast).toBeVisible({ timeout: 10000 });
        log.info(`TC-E001: Success toast visible for "${uniqueTitle}"`);

        // -- Step 4: Assert event appears in the admin list --
        await expect(adminPage.getEventRow(uniqueTitle)).toBeVisible();
        log.info(`TC-E001: "${uniqueTitle}" visible in admin list`);
      } finally {
        // -- Cleanup: locate event by title via API and delete --
        const token = await getAuthToken(request);
        const eventsRes = await request.get(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: events } = await eventsRes.json();
        const created = (events as any[]).find(e => e.title === uniqueTitle);
        if (created?.id) {
          await deleteEventViaApi(request, token, created.id);
          log.info(`TC-E001: Cleaned up event ID ${created.id}`);
        }
      }
    }
  );

  test(
    'TC-E002: POST /api/events returns 201 with correct event data structure',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const uniqueTitle = `${newEvent.title} API ${Date.now()}`;
      let eventId: number | undefined;

      try {
        // -- Step 1: POST a new event --
        const response = await request.post(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { ...newEvent, title: uniqueTitle },
        });
        expect(response.status()).toBe(201);

        // -- Step 2: Assert response shape and field values --
        const { data } = await response.json();
        eventId = data.id;
        expect(data.id).toBeTruthy();
        expect(data.title).toBe(uniqueTitle);
        expect(data.category).toBe(newEvent.category);
        expect(data.city).toBe(newEvent.city);
        expect(data.venue).toBe(newEvent.venue);
        expect(Number(data.price)).toBe(newEvent.price);
        log.info(`TC-E002: Created event ID: ${data.id}, title: "${data.title}"`);
      } finally {
        if (eventId) await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-E003: Delete user-created event via Admin UI — event removed from list',
    { tag: '@smoke' },
    async ({ page, request }) => {
      const loginPage = new LoginPage(page);
      const adminPage = new AdminEventPage(page);
      const uniqueTitle = `${newEvent.title} Del ${Date.now()}`;

      // -- Step 1: Create event via API as test setup --
      const token = await getAuthToken(request);
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });
      log.info(`TC-E003: Setup — created event ID ${eventId} via API`);

      // -- Step 2: Login and navigate to Admin Events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await adminPage.goto(baseUrl);

      // -- Step 3: Assert event is visible, then click Delete --
      await expect(adminPage.getEventRow(uniqueTitle)).toBeVisible();
      await adminPage.clickDeleteForEvent(uniqueTitle);

      // -- Step 4: Assert event no longer appears in list --
      await expect(adminPage.getEventRow(uniqueTitle)).not.toBeVisible({ timeout: 10000 });
      log.info(`TC-E003: "${uniqueTitle}" successfully deleted via Admin UI`);
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    'TC-E101: GET /api/events returns 200 with paginated event list',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET the events list --
      const response = await request.get(`${apiUrl}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert data array is non-empty and pagination info is present --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination).toBeTruthy();
      expect(typeof body.pagination.total).toBe('number');
      log.info(`TC-E101: ${body.data.length} events returned, total: ${body.pagination.total}`);
    }
  );

  test(
    'TC-E102: GET /api/events/:id returns 200 with correct event data',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const uniqueTitle = `${newEvent.title} GetById ${Date.now()}`;
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });

      try {
        // -- Step 1: GET the event by ID --
        const response = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 2: Assert returned event matches the created data --
        const { data } = await response.json();
        expect(data.id).toBe(eventId);
        expect(data.title).toBe(uniqueTitle);
        expect(data.venue).toBe(newEvent.venue);
        log.info(`TC-E102: GET /api/events/${eventId} → "${data.title}"`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-E103: Edit existing event via Admin UI — updated fields reflected in list',
    { tag: '@sanity' },
    async ({ page, request }) => {
      const loginPage = new LoginPage(page);
      const adminPage = new AdminEventPage(page);
      const uniqueTitle = `${newEvent.title} Edit ${Date.now()}`;
      const updatedTitle = `${updatedEvent.title} ${Date.now()}`;

      // -- Step 1: Create event via API as test setup --
      const token = await getAuthToken(request);
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });
      log.info(`TC-E103: Setup — created event ID ${eventId}`);

      try {
        // -- Step 2: Login and navigate to Admin Events --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await adminPage.goto(baseUrl);

        // -- Step 3: Find the event and click Edit --
        await expect(adminPage.getEventRow(uniqueTitle)).toBeVisible();
        await adminPage.clickEditForEvent(uniqueTitle);

        // -- Step 4: Update title and venue, then submit --
        await adminPage.updateEvent({ title: updatedTitle, venue: updatedEvent.venue });

        // -- Step 5: Assert updated title is visible in the list --
        await expect(adminPage.getEventRow(updatedTitle)).toBeVisible({ timeout: 10000 });
        log.info(`TC-E103: Updated title "${updatedTitle}" visible in admin list`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-E104: PUT /api/events/:id updates event and returns 200 with updated data',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const uniqueTitle = `${newEvent.title} Put ${Date.now()}`;
      const updatedTitle = `${updatedEvent.title} ${Date.now()}`;
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });

      try {
        // -- Step 1: PUT updated fields to the event --
        const response = await request.put(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { ...newEvent, title: updatedTitle, venue: updatedEvent.venue, price: updatedEvent.price },
        });
        expect(response.status()).toBe(200);

        // -- Step 2: Assert response reflects the updated field values --
        const { data } = await response.json();
        expect(data.title).toBe(updatedTitle);
        expect(data.venue).toBe(updatedEvent.venue);
        expect(Number(data.price)).toBe(updatedEvent.price);
        log.info(`TC-E104: PUT /api/events/${eventId} → title: "${data.title}", price: ${data.price}`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-E105: DELETE /api/events/:id removes event — subsequent GET returns 404',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const uniqueTitle = `${newEvent.title} DelAPI ${Date.now()}`;
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });

      // -- Step 1: DELETE the event --
      const deleteRes = await request.delete(`${apiUrl}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 204]).toContain(deleteRes.status());
      log.info(`TC-E105: DELETE /api/events/${eventId} → ${deleteRes.status()}`);

      // -- Step 2: GET the deleted event — expect 404 --
      const getRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status()).toBe(404);
      log.info(`TC-E105: Confirmed event ${eventId} no longer exists (404)`);
    }
  );

  test(
    'TC-E106: PUT on static event returns 403 — static events cannot be modified',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Attempt to PUT a known static event --
      const response = await request.put(`${apiUrl}/api/events/${staticEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ...newEvent, title: 'Attempted Override of Static Event' },
      });

      // -- Step 2: Assert 403 Forbidden --
      expect(response.status()).toBe(403);
      log.info(`TC-E106: PUT static event ID ${staticEvent.id} → ${response.status()} (403 as expected)`);
    }
  );

  test(
    'TC-E107: DELETE on static event returns 403 — static events cannot be deleted',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Attempt to DELETE a known static event --
      const response = await request.delete(`${apiUrl}/api/events/${staticEvent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // -- Step 2: Assert 403 Forbidden --
      expect(response.status()).toBe(403);
      log.info(`TC-E107: DELETE static event ID ${staticEvent.id} → ${response.status()} (403 as expected)`);
    }
  );

  test(
    'TC-E108: Newly created event via API appears in GET /api/events list',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const uniqueTitle = `${newEvent.title} List ${Date.now()}`;
      const eventId = await createEventViaApi(request, token, { title: uniqueTitle });

      try {
        // -- Step 1: GET the events list --
        const response = await request.get(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 2: Assert the newly created event title appears in the results --
        const { data: events } = await response.json();
        const found = (events as any[]).some(e => e.title === uniqueTitle);
        expect(found).toBe(true);
        log.info(`TC-E108: Event "${uniqueTitle}" (ID: ${eventId}) found in events list`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

});
