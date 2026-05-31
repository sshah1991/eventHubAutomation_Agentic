import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { CrossUserSecurityPage } from '../../pages/SecurityAndIsolation/CrossUserSecurityPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/SecurityAndIsolation/crossUserSecurity.data.json';

const log = createLogger('CrossUserSecurity');

const {
  baseUrl,
  apiUrl,
  userA,
  userBTemplate,
  testEventTemplate,
  testBookingTemplate,
  staticEventId,
} = testData;

// ── API helpers ────────────────────────────────────────────────────────────

async function getAuthToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email, password },
  });
  const { token } = await res.json();
  return token;
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

async function createBookingViaApi(
  request: APIRequestContext,
  token: string,
  eventId: number,
  customerEmail: string
): Promise<{ id: number; bookingRef: string }> {
  const res = await request.post(`${apiUrl}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...testBookingTemplate, eventId, customerEmail },
  });
  const { data } = await res.json();
  return { id: data.id as number, bookingRef: data.bookingRef as string };
}

async function deleteBookingViaApi(
  request: APIRequestContext,
  token: string,
  bookingId: number
): Promise<void> {
  await request.delete(`${apiUrl}/api/bookings/${bookingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ──────────────────────────────────────────────────────────────────────────

test.describe('CrossUserSecurity', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    "TC-CUS001: User B token returns 403 on GET /api/bookings/:id for User A's booking",
    { tag: '@smoke' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      let eventId: number | undefined;
      let bookingId: number | undefined;

      try {
        // -- Step 1: User A creates a dynamic event and a booking --
        eventId = await createEventViaApi(request, tokenA, `CUS001-${Date.now()}`);
        ({ id: bookingId } = await createBookingViaApi(request, tokenA, eventId, userA.email));
        log.info(`TC-CUS001: User A created booking ID ${bookingId}`);

        // -- Step 2: User B attempts to GET User A's booking by ID --
        const response = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });

        // -- Step 3: Assert 403 Forbidden --
        expect(response.status()).toBe(403);
        log.info(`TC-CUS001: User B (${userBEmail}) cross-access returned ${response.status()} → Forbidden ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, tokenA, bookingId);
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  test(
    "TC-CUS002: User B sees 'Access Denied' in UI when navigating to User A's booking page",
    { tag: '@smoke' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const securityPage = new CrossUserSecurityPage(page);
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      await registerUser(request, userBEmail, userBTemplate.password);
      let eventId: number | undefined;
      let bookingId: number | undefined;

      try {
        // -- Step 1: User A creates an event and a booking, capturing the booking ID --
        eventId = await createEventViaApi(request, tokenA, `CUS002-${Date.now()}`);
        ({ id: bookingId } = await createBookingViaApi(request, tokenA, eventId, userA.email));
        log.info(`TC-CUS002: User A booking ID ${bookingId} captured`);

        // -- Step 2: User B logs in via the UI --
        await loginPage.goto(baseUrl);
        await loginPage.login(userBEmail, userBTemplate.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        log.info(`TC-CUS002: User B (${userBEmail}) logged in via UI`);

        // -- Step 3: User B navigates directly to User A's booking detail URL --
        await securityPage.gotoBookingDetail(baseUrl, String(bookingId));

        // -- Step 4: Assert "Access Denied" message is visible --
        await expect(securityPage.accessDeniedMessage).toBeVisible();
        log.info(`TC-CUS002: "Access Denied" UI message confirmed for booking ${bookingId} ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, tokenA, bookingId);
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    "TC-CUS101: User B cannot cancel User A's booking via DELETE /api/bookings/:id → 403",
    { tag: '@sanity' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      let eventId: number | undefined;
      let bookingId: number | undefined;

      try {
        // -- Step 1: User A creates an event and a booking --
        eventId = await createEventViaApi(request, tokenA, `CUS101-${Date.now()}`);
        ({ id: bookingId } = await createBookingViaApi(request, tokenA, eventId, userA.email));
        log.info(`TC-CUS101: User A booking ID ${bookingId} created`);

        // -- Step 2: User B attempts to DELETE User A's booking --
        const deleteResponse = await request.delete(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });

        // -- Step 3: Assert 403 Forbidden --
        expect(deleteResponse.status()).toBe(403);

        // -- Step 4: Verify User A's booking still exists after the unauthorized attempt --
        const verifyRes = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        expect(verifyRes.status()).toBe(200);
        log.info(`TC-CUS101: User B DELETE returned 403; booking ${bookingId} still intact ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, tokenA, bookingId);
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  test(
    "TC-CUS102: User B cannot edit User A's event via PUT /api/events/:id → 403",
    { tag: '@sanity' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      const originalTitle = `CUS102-${Date.now()}`;
      let eventId: number | undefined;

      try {
        // -- Step 1: User A creates a dynamic event --
        eventId = await createEventViaApi(request, tokenA, originalTitle);
        log.info(`TC-CUS102: User A created event ID ${eventId} with title "${originalTitle}"`);

        // -- Step 2: User B attempts to PUT (update) User A's event --
        const putResponse = await request.put(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
          data: { ...testEventTemplate, title: 'Hijacked Event Title' },
        });

        // -- Step 3: Assert 403 Forbidden --
        expect(putResponse.status()).toBe(403);

        // -- Step 4: Verify the event title is unchanged --
        const verifyRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        expect(verifyRes.status()).toBe(200);
        const { data: event } = await verifyRes.json();
        expect(event.title).not.toBe('Hijacked Event Title');
        log.info(`TC-CUS102: User B PUT returned 403; event title remains "${event.title}" ✓`);
      } finally {
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  test(
    "TC-CUS103: User B cannot delete User A's event via DELETE /api/events/:id → 403",
    { tag: '@sanity' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      let eventId: number | undefined;

      try {
        // -- Step 1: User A creates a dynamic event --
        eventId = await createEventViaApi(request, tokenA, `CUS103-${Date.now()}`);
        log.info(`TC-CUS103: User A created event ID ${eventId}`);

        // -- Step 2: User B attempts to DELETE User A's event --
        const deleteResponse = await request.delete(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });

        // -- Step 3: Assert 403 Forbidden --
        expect(deleteResponse.status()).toBe(403);

        // -- Step 4: Verify User A's event still exists after the unauthorized attempt --
        const verifyRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        expect(verifyRes.status()).toBe(200);
        log.info(`TC-CUS103: User B DELETE returned 403; event ${eventId} still exists ✓`);
      } finally {
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

  test(
    "TC-CUS104: GET /api/bookings returns only the authenticated user's own bookings",
    { tag: '@sanity' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      let eventIdA: number | undefined;
      let bookingIdA: number | undefined;
      let bookingIdB: number | undefined;

      try {
        // -- Step 1: User A creates a dynamic event and a booking against it --
        eventIdA = await createEventViaApi(request, tokenA, `CUS104-${Date.now()}`);
        ({ id: bookingIdA } = await createBookingViaApi(request, tokenA, eventIdA, userA.email));
        log.info(`TC-CUS104: User A booking ID ${bookingIdA}`);

        // -- Step 2: User B creates a booking against a static event --
        ({ id: bookingIdB } = await createBookingViaApi(request, tokenB, staticEventId, userBEmail));
        log.info(`TC-CUS104: User B booking ID ${bookingIdB}`);

        // -- Step 3: User A's list must not contain User B's booking --
        const bookingsA = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        expect(bookingsA.status()).toBe(200);
        const idsForA = ((await bookingsA.json()).data as any[]).map((b: any) => b.id);
        expect(idsForA).not.toContain(bookingIdB);

        // -- Step 4: User B's list must not contain User A's booking --
        const bookingsB = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });
        expect(bookingsB.status()).toBe(200);
        const idsForB = ((await bookingsB.json()).data as any[]).map((b: any) => b.id);
        expect(idsForB).not.toContain(bookingIdA);

        log.info(`TC-CUS104: Booking isolation confirmed — A sees ${idsForA.length} bookings, B sees ${idsForB.length} ✓`);
      } finally {
        if (bookingIdA) await deleteBookingViaApi(request, tokenA, bookingIdA);
        if (bookingIdB) await deleteBookingViaApi(request, tokenB, bookingIdB);
        if (eventIdA) await deleteEventViaApi(request, tokenA, eventIdA);
      }
    }
  );

  test(
    "TC-CUS105: User B cannot access User A's booking by reference via GET /api/bookings/ref/:ref → 403",
    { tag: '@sanity' },
    async ({ request }) => {
      const tokenA = await getAuthToken(request, userA.email, userA.password);
      const userBEmail = `${userBTemplate.emailPrefix}${Date.now()}${userBTemplate.emailDomain}`;
      const tokenB = await registerUser(request, userBEmail, userBTemplate.password);
      let eventId: number | undefined;
      let bookingId: number | undefined;
      let bookingRef: string | undefined;

      try {
        // -- Step 1: User A creates a booking and captures the booking reference --
        eventId = await createEventViaApi(request, tokenA, `CUS105-${Date.now()}`);
        ({ id: bookingId, bookingRef } = await createBookingViaApi(request, tokenA, eventId, userA.email));
        log.info(`TC-CUS105: User A booking ref "${bookingRef}" (ID ${bookingId})`);

        // -- Step 2: User B attempts to look up the booking by its reference --
        const response = await request.get(`${apiUrl}/api/bookings/ref/${bookingRef}`, {
          headers: { Authorization: `Bearer ${tokenB}` },
        });

        // -- Step 3: Assert 403 Forbidden --
        expect(response.status()).toBe(403);
        log.info(`TC-CUS105: User B GET /ref/${bookingRef} returned ${response.status()} → Forbidden ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, tokenA, bookingId);
        if (eventId) await deleteEventViaApi(request, tokenA, eventId);
      }
    }
  );

});
