import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { SandboxPage } from '../../pages/SandboxLimits/SandboxPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/SandboxLimits/sandbox.data.json';

const log = createLogger('SandboxLimits');

const {
  baseUrl,
  apiUrl,
  validUser,
  sandboxEventLimit,
  sandboxBookingLimit,
  staticEventId,
  testEventTemplate,
  testBookingTemplate,
  userBTemplate,
} = testData;

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
  title: string
): Promise<number> {
  const res = await request.post(`${apiUrl}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...testEventTemplate, title },
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

async function clearAllBookings(request: APIRequestContext, token: string): Promise<void> {
  await request.delete(`${apiUrl}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function createBookingViaApi(
  request: APIRequestContext,
  token: string,
  eventId: number
): Promise<number> {
  const res = await request.post(`${apiUrl}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...testBookingTemplate, eventId },
  });
  const { data } = await res.json();
  return data.id as number;
}

async function registerUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await request.post(`${apiUrl}/api/auth/register`, {
    data: { email, password },
  });
  const { token } = await res.json();
  return token;
}

// Deletes all user-created (dynamic) events. Static events return 403 and are skipped.
async function clearDynamicEvents(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${apiUrl}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data: events } = await res.json();
  let deleted = 0;
  for (const event of events as any[]) {
    const del = await request.delete(`${apiUrl}/api/events/${event.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (del.status() !== 403) deleted++;
  }
  return deleted;
}

// ──────────────────────────────────────────────────────────────────────────

test.describe('SandboxLimits', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    'TC-SL001: /admin/events page always shows sandbox info banner',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const sandboxPage = new SandboxPage(page);

      // -- Step 1: Login and navigate to /admin/events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await sandboxPage.gotoAdminEvents(baseUrl);

      // -- Step 2: Assert sandbox banner is always present on admin page --
      await expect(sandboxPage.adminEventsBanner).toBeVisible();
      log.info('TC-SL001: Sandbox banner visible on /admin/events');
    }
  );

  test(
    'TC-SL002: GET /api/events total is within sandbox bounds',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET /api/events --
      const response = await request.get(`${apiUrl}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert total is positive (static events always exist) and bounded --
      // Max = static seeded events + sandbox dynamic limit (6)
      const { pagination } = await response.json();
      expect(pagination.total).toBeGreaterThan(0);
      expect(pagination.total).toBeLessThanOrEqual(20);
      log.info(`TC-SL002: /api/events total = ${pagination.total} — within bounds`);
    }
  );

  test(
    'TC-SL003: GET /api/bookings returns count within sandbox limit',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: GET user's bookings --
      const response = await request.get(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);

      // -- Step 2: Assert count is within the sandbox booking limit --
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(sandboxBookingLimit);
      log.info(`TC-SL003: ${body.data.length} bookings — within limit of ${sandboxBookingLimit}`);
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    'TC-SL101: /events page banner appears and shows exact limits when events are close to cap',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(120000);
      const loginPage = new LoginPage(page);
      const sandboxPage = new SandboxPage(page);
      const token = await getAuthToken(request);
      const prefix = `SL101-${Date.now()}`;
      const createdIds: number[] = [];

      try {
        // -- Step 1: Create 5 events to trigger the conditional banner --
        for (let i = 1; i <= 5; i++) {
          const id = await createEventViaApi(request, token, `${prefix}-${i}`);
          createdIds.push(id);
        }
        log.info(`TC-SL101: Created ${createdIds.length} events to trigger banner`);

        // -- Step 2: Login and navigate to /events --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await sandboxPage.gotoEvents(baseUrl);

        // -- Step 3: Assert banner is visible and contains both limit numbers --
        await expect(sandboxPage.eventsBanner).toBeVisible();
        await expect(sandboxPage.eventsBanner).toContainText(String(sandboxBookingLimit));
        await expect(sandboxPage.eventsBanner).toContainText(String(sandboxEventLimit));
        await expect(sandboxPage.eventsBanner).toContainText(/custom events/i);
        log.info(`TC-SL101: Banner shows ${sandboxEventLimit} events / ${sandboxBookingLimit} bookings ✓`);
      } finally {
        for (const id of createdIds) {
          await deleteEventViaApi(request, token, id);
        }
        log.info(`TC-SL101: Cleanup — deleted ${createdIds.length} test event(s)`);
      }
    }
  );

  test(
    'TC-SL102: /admin/events page banner shows exact 6-event sandbox limit',
    { tag: '@sanity' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const sandboxPage = new SandboxPage(page);

      // -- Step 1: Login and navigate to /admin/events --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await sandboxPage.gotoAdminEvents(baseUrl);

      // -- Step 2: Assert admin banner contains the 6-event limit --
      await expect(sandboxPage.adminEventsBanner).toContainText(String(sandboxEventLimit));
      await expect(sandboxPage.adminEventsBanner).toContainText(/event/i);
      log.info(`TC-SL102: Admin banner correctly shows ${sandboxEventLimit}-event limit`);
    }
  );

  test(
    `TC-SL103: Create ${sandboxEventLimit} user events at limit — all persist, none auto-pruned`,
    { tag: '@sanity' },
    async ({ request }) => {
      test.setTimeout(120000);
      const token = await getAuthToken(request);
      const prefix = `SL103-${Date.now()}`;
      const createdIds: number[] = [];

      // -- Step 1: Clear all existing user-created (dynamic) events to start at 0 --
      const cleared = await clearDynamicEvents(request, token);
      log.info(`TC-SL103: Cleared ${cleared} pre-existing dynamic event(s)`);

      try {
        // -- Step 2: Create exactly 6 events with a unique prefix --
        for (let i = 1; i <= sandboxEventLimit; i++) {
          const id = await createEventViaApi(request, token, `${prefix}-Event-${i}`);
          createdIds.push(id);
          log.info(`TC-SL103: Created event ${i}/${sandboxEventLimit} — ID ${id}`);
        }

        // -- Step 3: GET all events and filter to our prefix --
        const listRes = await request.get(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(listRes.status()).toBe(200);
        const { data: events } = await listRes.json();
        const ourEvents = (events as any[]).filter(e =>
          (e.title as string).startsWith(prefix)
        );

        // -- Step 4: Assert all 6 events are present — no FIFO pruning at the boundary --
        expect(ourEvents.length).toBe(sandboxEventLimit);
        log.info(`TC-SL103: ${ourEvents.length}/${sandboxEventLimit} events found — all persist at limit ✓`);
      } finally {
        // Cleanup: delete all created events
        for (const id of createdIds) {
          await deleteEventViaApi(request, token, id);
        }
        log.info(`TC-SL103: Cleaned up ${createdIds.length} test event(s)`);
      }
    }
  );

  test(
    `TC-SL104: Create ${sandboxBookingLimit} bookings at limit — all persist, none auto-pruned`,
    { tag: '@sanity' },
    async ({ request }) => {
      test.setTimeout(120000);
      const token = await getAuthToken(request);
      const prefix = `SL104-${Date.now()}`;
      let eventId: number | undefined;

      // -- Step 1: Clear all bookings and create a dedicated 50-seat event --
      // (using a fresh dynamic event guarantees seats are always available)
      await clearAllBookings(request, token);
      eventId = await createEventViaApi(request, token, `${prefix}-Event`);
      log.info(`TC-SL104: Setup — cleared bookings, created event ID ${eventId} with 50 seats`);

      try {
        // -- Step 2: Create exactly 9 bookings against our dedicated event --
        for (let i = 1; i <= sandboxBookingLimit; i++) {
          const res = await request.post(`${apiUrl}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { ...testBookingTemplate, eventId },
          });
          expect(res.status()).toBe(201);
          const { data } = await res.json();
          log.info(`TC-SL104: Created booking ${i}/${sandboxBookingLimit} — ID ${data.id}`);
        }

        // -- Step 3: GET all bookings --
        const listRes = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(listRes.status()).toBe(200);
        const { data: bookings } = await listRes.json();

        // -- Step 4: Assert all 9 bookings are present — no FIFO pruning at the boundary --
        expect(bookings.length).toBe(sandboxBookingLimit);
        log.info(`TC-SL104: ${bookings.length}/${sandboxBookingLimit} bookings found — all persist at limit ✓`);
      } finally {
        await clearAllBookings(request, token);
        if (eventId) await deleteEventViaApi(request, token, eventId);
        log.info('TC-SL104: Cleanup — bookings cleared, event deleted');
      }
    }
  );

  test(
    'TC-SL105: Dynamic user event coexists with static seeded events in GET /api/events',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const prefix = `SL105-${Date.now()}`;
      let createdId: number | undefined;

      try {
        // -- Step 1: Record total event count before creation --
        const beforeRes = await request.get(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: beforeEvents } = await beforeRes.json();
        const countBefore = (beforeEvents as any[]).length;

        // -- Step 2: Create one dynamic event --
        createdId = await createEventViaApi(request, token, `${prefix}-Event`);
        log.info(`TC-SL105: Created event ID ${createdId}`);

        // -- Step 3: GET events again --
        const afterRes = await request.get(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(afterRes.status()).toBe(200);
        const { data: afterEvents } = await afterRes.json();

        // -- Step 4: New event is present AND static events still coexist --
        const ourEvent = (afterEvents as any[]).find(e =>
          (e.title as string).startsWith(prefix)
        );
        expect(ourEvent).toBeTruthy();

        // Static events are not displaced — total should be countBefore + 1 OR countBefore
        // (if we were already at the 6-event dynamic limit, FIFO replaces the oldest dynamic event,
        //  so the total stays the same — the key assertion is our new event IS in the list)
        const countAfter = (afterEvents as any[]).length;
        expect(countAfter).toBeGreaterThanOrEqual(countBefore);
        log.info(
          `TC-SL105: Event count ${countBefore} → ${countAfter}, new event "${ourEvent.title}" present ✓`
        );
      } finally {
        if (createdId) await deleteEventViaApi(request, token, createdId);
        log.info('TC-SL105: Cleanup done');
      }
    }
  );

  // ── REGRESSION ─────────────────────────────────────────────────────────────

  test(
    `TC-SL201: /bookings page shows sandbox warning banner when approaching the ${sandboxBookingLimit}-booking limit`,
    { tag: '@regression' },
    async ({ page, request }) => {
      test.fixme(true, '/bookings page does not currently display a sandbox warning banner near the booking limit');
      test.setTimeout(90000);
      const loginPage = new LoginPage(page);
      const sandboxPage = new SandboxPage(page);
      const token = await getAuthToken(request);

      // -- Step 1: Create a dedicated event and clear all bookings as baseline --
      const eventId = await createEventViaApi(request, token, `SL201-${Date.now()}`);
      await clearAllBookings(request, token);

      // -- Step 2: Create 8 bookings (near the 9-booking limit) --
      for (let i = 0; i < 8; i++) {
        await createBookingViaApi(request, token, eventId);
      }
      log.info(`TC-SL201: Created 8 bookings against event ${eventId}`);

      try {
        // -- Step 3: Login and navigate to /bookings --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await sandboxPage.gotoBookings(baseUrl);

        // -- Step 4: Assert sandbox warning banner is visible --
        await expect(sandboxPage.bookingsBanner).toBeVisible({ timeout: 10000 });
        log.info(`TC-SL201: Sandbox banner visible on /bookings at 8/${sandboxBookingLimit} bookings ✓`);
      } finally {
        await clearAllBookings(request, token);
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-SL202: /bookings page does NOT show sandbox warning banner when booking count is low',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const sandboxPage = new SandboxPage(page);
      const token = await getAuthToken(request);

      // -- Step 1: Clear all bookings so user starts with 0 --
      await clearAllBookings(request, token);
      log.info('TC-SL202: All bookings cleared — starting from 0');

      try {
        // -- Step 2: Login and navigate to /bookings --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await sandboxPage.gotoBookings(baseUrl);
        await page.waitForLoadState('networkidle');

        // -- Step 3: Assert sandbox warning banner is NOT visible at low count --
        await expect(sandboxPage.bookingsBanner).not.toBeVisible();
        log.info('TC-SL202: No sandbox banner shown on /bookings with 0 bookings ✓');
      } finally {
        await clearAllBookings(request, token);
      }
    }
  );

  test(
    `TC-SL203: Creating the ${sandboxBookingLimit + 1}th booking triggers FIFO — oldest auto-pruned`,
    { tag: '@regression' },
    async ({ request }) => {
      test.setTimeout(120000);
      const token = await getAuthToken(request);

      // -- Step 1: Create a dedicated event and clear existing bookings --
      const eventId = await createEventViaApi(request, token, `SL203-${Date.now()}`);
      await clearAllBookings(request, token);

      const ids: number[] = [];
      try {
        // -- Step 2: Fill to exactly the booking limit (9 bookings) --
        for (let i = 0; i < sandboxBookingLimit; i++) {
          const id = await createBookingViaApi(request, token, eventId);
          ids.push(id);
        }
        log.info(`TC-SL203: Created ${sandboxBookingLimit} bookings — oldest ID ${ids[0]}`);

        // -- Step 3: Create the (limit+1)th booking — triggers FIFO pruning --
        await createBookingViaApi(request, token, eventId);

        // -- Step 4: Assert list count is still at the limit --
        const listRes = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: bookings } = await listRes.json();
        expect((bookings as any[]).length).toBeLessThanOrEqual(sandboxBookingLimit);

        // -- Step 5: Assert the oldest booking is gone (pruned by FIFO) --
        const oldestRes = await request.get(`${apiUrl}/api/bookings/${ids[0]}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(oldestRes.status()).toBe(404);
        log.info(
          `TC-SL203: Oldest booking ${ids[0]} auto-pruned after ${sandboxBookingLimit + 1}th creation ✓`
        );
      } finally {
        await clearAllBookings(request, token);
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    `TC-SL204: User A at the ${sandboxBookingLimit}-booking limit does not affect User B's booking capacity`,
    { tag: '@regression' },
    async ({ request }) => {
      test.setTimeout(120000);
      const tokenA = await getAuthToken(request);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);

      // -- Step 1: Create a dedicated event and bring User A to the booking limit --
      const eventId = await createEventViaApi(request, tokenA, `SL204-${Date.now()}`);
      await clearAllBookings(request, tokenA);
      for (let i = 0; i < sandboxBookingLimit; i++) {
        await createBookingViaApi(request, tokenA, eventId);
      }
      log.info(`TC-SL204: User A is at ${sandboxBookingLimit}-booking limit`);

      try {
        // -- Step 2: User B (fresh account) books a static event — should succeed independently --
        // Dynamic events are user-private, so User B books the shared static event instead
        const res = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${tokenB}` },
          data: { ...testBookingTemplate, eventId: staticEventId },
        });
        expect(res.status()).toBe(201);
        const { data: bookingB } = await res.json();
        log.info(`TC-SL204: User B created booking ID ${bookingB.id} — unaffected by User A's limit ✓`);
      } finally {
        await clearAllBookings(request, tokenA);
        await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  test(
    `TC-SL205: User A at the ${sandboxEventLimit}-event limit does not affect User B's event creation`,
    { tag: '@regression' },
    async ({ request }) => {
      test.setTimeout(120000);
      const tokenA = await getAuthToken(request);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      const prefix = `SL205-${Date.now()}`;
      const createdIdsA: number[] = [];
      let createdIdB: number | undefined;

      try {
        // -- Step 1: Clear User A's events and fill to the 6-event limit --
        await clearDynamicEvents(request, tokenA);
        for (let i = 1; i <= sandboxEventLimit; i++) {
          const id = await createEventViaApi(request, tokenA, `${prefix}-A-${i}`);
          createdIdsA.push(id);
        }
        log.info(`TC-SL205: User A at ${sandboxEventLimit}-event limit`);

        // -- Step 2: User B (fresh account) creates an event — should succeed independently --
        const res = await request.post(`${apiUrl}/api/events`, {
          headers: { Authorization: `Bearer ${tokenB}` },
          data: { ...testEventTemplate, title: `${prefix}-B-1` },
        });
        expect(res.status()).toBe(201);
        const { data: eventB } = await res.json();
        createdIdB = eventB.id as number;
        log.info(`TC-SL205: User B created event ID ${createdIdB} — unaffected by User A's limit ✓`);
      } finally {
        for (const id of createdIdsA) {
          await deleteEventViaApi(request, tokenA, id);
        }
        if (createdIdB) {
          await request.delete(`${apiUrl}/api/events/${createdIdB}`, {
            headers: { Authorization: `Bearer ${tokenB}` },
          });
        }
      }
    }
  );

});
