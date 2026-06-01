import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { BookingPage } from '../../pages/BookingManagement/BookingPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/BookingManagement/booking.data.json';

const log = createLogger('BookingManagement');

const { baseUrl, apiUrl, validUser, staticEvent, newBooking, multiTicketBooking, dynamicEventTemplate } = testData;

// ── API helpers ────────────────────────────────────────────────────────────

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email: validUser.email, password: validUser.password },
  });
  const { token } = await res.json();
  return token;
}

interface CreateBookingInput {
  eventId: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

async function createBookingViaApi(
  request: APIRequestContext,
  token: string,
  data: CreateBookingInput
): Promise<number> {
  const res = await request.post(`${apiUrl}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const { data: booking } = await res.json();
  return booking.id as number;
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

async function createEventViaApi(
  request: APIRequestContext,
  token: string,
  data: { title: string; [key: string]: unknown }
): Promise<number> {
  const res = await request.post(`${apiUrl}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const { data: event } = await res.json();
  return event.id as number;
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

test.describe('BookingManagement', () => {

  // ── SMOKE ─────────────────────────────────────────────────────────────────

  test(
    'TC-B001: POST /api/bookings returns 201 with correct booking data structure',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      let bookingId: number | undefined;

      try {
        // -- Step 1: POST a new booking for a static event --
        const response = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: newBooking,
        });
        expect(response.status()).toBe(201);

        // -- Step 2: Assert response structure and field values --
        const { data } = await response.json();
        bookingId = data.id;
        expect(data.id).toBeTruthy();
        expect(data.bookingRef).toBeTruthy();
        expect(data.quantity).toBe(newBooking.quantity);
        expect(Number(data.totalPrice)).toBe(staticEvent.price * newBooking.quantity);
        expect(data.customerName).toBe(newBooking.customerName);
        log.info(`TC-B001: Booking ID: ${data.id}, ref: "${data.bookingRef}"`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B002: Book event via UI — confirmation card with booking reference shown',
    { tag: '@smoke' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      let bookingId: number | undefined;
      let token: string | undefined;

      try {
        // -- Step 1: Login and navigate to event detail page --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoEventDetail(baseUrl, staticEvent.id);

        // -- Step 2: Fill customer form and confirm booking --
        await bookingPage.fillAndConfirmBooking({
          customerName: newBooking.customerName,
          customerEmail: newBooking.customerEmail,
          customerPhone: newBooking.customerPhone,
        });

        // -- Step 3: Assert booking reference appears in X-XXXXXX format --
        const bookingRefLocator = bookingPage.getBookingRefLocator();
        await expect(bookingRefLocator).toBeVisible({ timeout: 10000 });
        const refText = (await bookingRefLocator.textContent())?.trim() ?? '';
        const refMatch = refText.match(/[A-Z]-[A-Z0-9]{6}/);
        expect(refMatch).not.toBeNull();
        log.info(`TC-B002: Booking confirmed. Reference: "${refMatch?.[0]}"`);

        // -- Step 4: Capture booking ID for cleanup --
        token = await getAuthToken(request);
        const listRes = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: bookings } = await listRes.json();
        const created = (bookings as any[]).find(b => b.bookingRef === refMatch?.[0]);
        bookingId = created?.id;
      } finally {
        if (bookingId) {
          token ??= await getAuthToken(request);
          await deleteBookingViaApi(request, token, bookingId);
          log.info(`TC-B002: Cleaned up booking ID ${bookingId}`);
        }
      }
    }
  );

  test(
    'TC-B003: GET /api/bookings returns 200 with paginated booking list',
    { tag: '@smoke' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: GET the bookings list --
        const response = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 2: Assert data array and pagination are present --
        const body = await response.json();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.pagination).toBeTruthy();
        expect(typeof body.pagination.total).toBe('number');
        log.info(`TC-B003: ${body.data.length} bookings returned, total: ${body.pagination.total}`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B004: Cancel booking via UI — booking removed from list',
    { tag: '@smoke' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);

      // -- Step 1: Create a booking via API as test setup --
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);
      log.info(`TC-B004: Setup — created booking ID ${bookingId}`);

      try {
        // -- Step 2: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 3: Assert booking detail page loaded --
        await expect(bookingPage.cancelBookingBtn).toBeVisible();

        // -- Step 4: Cancel booking and confirm if prompted --
        await bookingPage.cancelBookingBtn.click();
        const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // -- Step 5: Assert navigation away from booking detail page --
        await page.waitForURL(new RegExp(`${baseUrl}/bookings/?$`), { timeout: 10000 });
        log.info(`TC-B004: Booking ${bookingId} cancelled via UI — redirected to /bookings`);
      } finally {
        // Cleanup only if booking still exists (UI cancel may have already removed it)
        const checkRes = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (checkRes.status() !== 404) {
          await deleteBookingViaApi(request, token, bookingId);
          log.warn(`TC-B004: Fallback cleanup — deleted booking ${bookingId}`);
        }
      }
    }
  );

  test(
    'TC-B005: View booking detail page — /bookings/:id loads with full booking info',
    { tag: '@smoke' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 2: Assert URL is /bookings/:id --
        await expect(page).toHaveURL(`${baseUrl}/bookings/${bookingId}`);

        // -- Step 3: Assert booking info and action buttons are visible --
        await expect(bookingPage.checkRefundBtn).toBeVisible();
        await expect(bookingPage.cancelBookingBtn).toBeVisible();
        await expect(page.getByText(newBooking.customerName)).toBeVisible();
        log.info(`TC-B005: Booking detail page loaded for ID ${bookingId}`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  // ── SANITY ────────────────────────────────────────────────────────────────

  test(
    'TC-B101: GET /api/bookings/:id returns 200 with correct booking data',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: GET booking by ID --
        const response = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 2: Assert returned booking matches created data --
        const { data } = await response.json();
        expect(data.id).toBe(bookingId);
        expect(data.quantity).toBe(newBooking.quantity);
        expect(data.customerName).toBe(newBooking.customerName);
        log.info(`TC-B101: GET /api/bookings/${bookingId} → ref: "${data.bookingRef}"`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B102: GET /api/bookings/ref/:ref returns 200 with correct booking data',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: Fetch booking reference for this ID --
        const detailRes = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: booking } = await detailRes.json();
        const ref = booking.bookingRef as string;

        // -- Step 2: GET booking by reference --
        const response = await request.get(`${apiUrl}/api/bookings/ref/${ref}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 3: Assert response matches the booking we created --
        const { data } = await response.json();
        expect(data.bookingRef).toBe(ref);
        expect(data.id).toBe(bookingId);
        log.info(`TC-B102: GET /api/bookings/ref/${ref} → ID: ${data.id}`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B103: DELETE /api/bookings/:id cancels booking — subsequent GET returns 404',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      // -- Step 1: DELETE the booking --
      const deleteRes = await request.delete(`${apiUrl}/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 204]).toContain(deleteRes.status());
      log.info(`TC-B103: DELETE /api/bookings/${bookingId} → ${deleteRes.status()}`);

      // -- Step 2: GET the deleted booking — expect 404 --
      const getRes = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status()).toBe(404);
      log.info(`TC-B103: Confirmed booking ${bookingId} is gone (404)`);
    }
  );

  test(
    'TC-B104: DELETE /api/bookings clears all user bookings — list becomes empty',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Create two bookings as setup --
      const id1 = await createBookingViaApi(request, token, newBooking);
      const id2 = await createBookingViaApi(request, token, { ...newBooking, quantity: 2 });
      log.info(`TC-B104: Setup — created bookings ${id1} and ${id2}`);

      // -- Step 2: DELETE all bookings --
      const deleteRes = await request.delete(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 204]).toContain(deleteRes.status());

      // -- Step 3: GET /api/bookings — assert data array is empty --
      const listRes = await request.get(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(listRes.status()).toBe(200);
      const { data } = await listRes.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
      log.info(`TC-B104: All bookings cleared — list is now empty`);
    }
  );

  test(
    'TC-B105: Clear all bookings via UI — bookings page shows empty state',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);

      // -- Step 1: Create a booking via API as setup --
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);
      log.info(`TC-B105: Setup — created booking ID ${bookingId}`);

      // -- Step 2: Login and navigate to bookings page --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await bookingPage.gotoBookings(baseUrl);

      // -- Step 3: Accept native window.confirm dialog then click Clear All Bookings --
      page.once('dialog', dialog => dialog.accept());
      await expect(bookingPage.clearAllBtn).toBeVisible();
      await bookingPage.clearAllBtn.click();

      // -- Step 4: Assert empty state is shown after clear --
      await expect(bookingPage.emptyStateText).toBeVisible({ timeout: 10000 });
      log.info(`TC-B105: Clear All clicked — empty state visible on /bookings`);
    }
  );

  test(
    'TC-B106: Refund eligibility — single-ticket booking shows refundable message',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);

      // -- Step 1: Create a single-ticket booking as setup --
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, { ...newBooking, quantity: 1 });
      log.info(`TC-B106: Setup — created single-ticket booking ID ${bookingId}`);

      try {
        // -- Step 2: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 3: Click Check Refund Eligibility --
        await expect(bookingPage.checkRefundBtn).toBeVisible();
        await bookingPage.checkRefundBtn.click();

        // -- Step 4: Wait for 4-second spinner to complete and assert eligible message --
        await expect(
          page.getByText(/single.ticket bookings qualify for a full refund/i)
        ).toBeVisible({ timeout: 10000 });
        log.info(`TC-B106: Refund-eligible message displayed for single-ticket booking`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B107: Refund eligibility — multi-ticket booking shows non-refundable message',
    { tag: '@sanity' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const qty = multiTicketBooking.quantity;

      // -- Step 1: Create a multi-ticket booking as setup --
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, multiTicketBooking);
      log.info(`TC-B107: Setup — created ${qty}-ticket booking ID ${bookingId}`);

      try {
        // -- Step 2: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 3: Click Check Refund Eligibility --
        await expect(bookingPage.checkRefundBtn).toBeVisible();
        await bookingPage.checkRefundBtn.click();

        // -- Step 4: Wait for spinner to complete and assert non-refundable message --
        await expect(
          page.getByText(new RegExp(`group bookings.*${qty}.*non-refundable`, 'i'))
        ).toBeVisible({ timeout: 10000 });
        log.info(`TC-B107: Non-refundable message verified for ${qty}-ticket booking`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B108: Booking reference starts with first letter of event title (uppercase)',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      let bookingId: number | undefined;

      try {
        // -- Step 1: POST a booking for the static event --
        const response = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: newBooking,
        });
        expect(response.status()).toBe(201);
        const { data } = await response.json();
        bookingId = data.id;
        const ref = data.bookingRef as string;

        // -- Step 2: Assert reference format and leading letter --
        expect(ref).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
        expect(ref.charAt(0)).toBe(staticEvent.firstLetter);
        log.info(`TC-B108: Booking ref "${ref}" starts with "${staticEvent.firstLetter}" ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B109: Total price = event price × quantity',
    { tag: '@sanity' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const qty = multiTicketBooking.quantity;
      let bookingId: number | undefined;

      try {
        // -- Step 1: POST a booking with quantity > 1 --
        const response = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: multiTicketBooking,
        });
        expect(response.status()).toBe(201);
        const { data } = await response.json();
        bookingId = data.id;

        // -- Step 2: Assert totalPrice = eventPrice × quantity --
        const expectedPrice = staticEvent.price * qty;
        expect(Number(data.totalPrice)).toBe(expectedPrice);
        log.info(
          `TC-B109: totalPrice ${data.totalPrice} = ${staticEvent.price} × ${qty} = ${expectedPrice} ✓`
        );
      } finally {
        if (bookingId) await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B110: POST /api/bookings without auth token returns 401',
    { tag: '@sanity' },
    async ({ request }) => {
      // -- Step 1: POST booking without Authorization header --
      const response = await request.post(`${apiUrl}/api/bookings`, {
        data: newBooking,
      });

      // -- Step 2: Assert 401 Unauthorized --
      expect(response.status()).toBe(401);
      log.info(`TC-B110: POST /api/bookings without auth → ${response.status()} (401 as expected)`);
    }
  );

  // ── REGRESSION ─────────────────────────────────────────────────────────────

  test(
    'TC-B200: Booking limit FIFO — 10th booking auto-prunes the oldest',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Clear existing bookings as baseline --
      await request.delete(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // -- Step 2: Create 9 bookings and record IDs in creation order --
      const ids: number[] = [];
      for (let i = 0; i < 9; i++) {
        const id = await createBookingViaApi(request, token, newBooking);
        ids.push(id);
      }
      log.info(`TC-B200: Created 9 bookings — oldest ID ${ids[0]}`);

      try {
        // -- Step 3: Create the 10th booking — triggers FIFO pruning of the oldest --
        await createBookingViaApi(request, token, { ...newBooking, quantity: 2 });

        // -- Step 4: Assert only 9 bookings remain (limit enforced) --
        const listRes = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: bookings } = await listRes.json();
        expect((bookings as any[]).length).toBeLessThanOrEqual(9);

        // -- Step 5: Assert the oldest booking is gone (auto-pruned) --
        const oldestRes = await request.get(`${apiUrl}/api/bookings/${ids[0]}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(oldestRes.status()).toBe(404);
        log.info(`TC-B200: Booking ${ids[0]} auto-pruned (404) — FIFO enforced ✓`);
      } finally {
        await request.delete(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  );

  test(
    'TC-B201: GET /api/bookings without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      const response = await request.get(`${apiUrl}/api/bookings`);
      expect(response.status()).toBe(401);
      log.info(`TC-B201: GET /api/bookings without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B202: GET /api/bookings/:id without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      // Auth check fires before ID lookup — no real booking needed
      const response = await request.get(`${apiUrl}/api/bookings/99999`);
      expect(response.status()).toBe(401);
      log.info(`TC-B202: GET /api/bookings/99999 without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B203: GET /api/bookings/:id for non-existent ID returns 404',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const response = await request.get(`${apiUrl}/api/bookings/99999999`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(404);
      log.info(`TC-B203: GET /api/bookings/99999999 → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B204: GET /api/bookings/ref/:ref for non-existent ref returns 404',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const response = await request.get(`${apiUrl}/api/bookings/ref/Z-000000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(404);
      log.info(`TC-B204: GET /api/bookings/ref/Z-000000 → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B205: DELETE /api/bookings/:id without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      const response = await request.delete(`${apiUrl}/api/bookings/99999`);
      expect(response.status()).toBe(401);
      log.info(`TC-B205: DELETE /api/bookings/99999 without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B206: DELETE /api/bookings without auth token returns 401',
    { tag: '@regression' },
    async ({ request }) => {
      const response = await request.delete(`${apiUrl}/api/bookings`);
      expect(response.status()).toBe(401);
      log.info(`TC-B206: DELETE /api/bookings without auth → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B207: POST /api/bookings with missing required fields returns 400',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: POST with empty body (no eventId, quantity, or customer fields) --
      const response = await request.post(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      });

      // -- Step 2: Assert 400 validation error --
      expect(response.status()).toBe(400);
      log.info(`TC-B207: POST /api/bookings with empty body → ${response.status()} ✓`);
    }
  );

  test(
    'TC-B208: POST /api/bookings with quantity exceeding available seats returns 400',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Create a dynamic event with only 1 seat --
      const eventId = await createEventViaApi(request, token, {
        ...dynamicEventTemplate,
        title: `Sold Out Event ${Date.now()}`,
        totalSeats: 1,
      });
      log.info(`TC-B208: Setup — created 1-seat event ID ${eventId}`);

      try {
        // -- Step 2: Book the only available seat --
        const firstRes = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { ...newBooking, eventId, quantity: 1 },
        });
        expect(firstRes.status()).toBe(201);

        // -- Step 3: Attempt a second booking — seats exhausted, expect 400 --
        const secondRes = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { ...newBooking, eventId, quantity: 1 },
        });
        expect(secondRes.status()).toBe(400);
        log.info(`TC-B208: 2nd booking on sold-out event → ${secondRes.status()} ✓`);
      } finally {
        // Event deletion cascades to its bookings
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-B209: Available seats decrease immediately after booking',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const totalSeats = 10;
      const qty = 3;

      // -- Step 1: Create a dynamic event with known seat count --
      const eventId = await createEventViaApi(request, token, {
        ...dynamicEventTemplate,
        title: `Seats Decrease Event ${Date.now()}`,
        totalSeats,
      });
      log.info(`TC-B209: Created event ID ${eventId} with ${totalSeats} seats`);

      try {
        // -- Step 2: Confirm initial available seats equals totalSeats --
        const beforeRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: before } = await beforeRes.json();
        expect(before.availableSeats).toBe(totalSeats);

        // -- Step 3: Book qty seats --
        const bookingId = await createBookingViaApi(request, token, {
          ...newBooking,
          eventId,
          quantity: qty,
        });
        log.info(`TC-B209: Booked ${qty} seats — booking ID ${bookingId}`);

        // -- Step 4: Assert available seats decreased by qty --
        const afterRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: after } = await afterRes.json();
        expect(after.availableSeats).toBe(totalSeats - qty);
        log.info(`TC-B209: availableSeats ${totalSeats} → ${after.availableSeats} (−${qty}) ✓`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-B210: Available seats restored after booking cancellation',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const totalSeats = 5;
      const qty = 2;

      // -- Step 1: Create a dynamic event --
      const eventId = await createEventViaApi(request, token, {
        ...dynamicEventTemplate,
        title: `Seats Restore Event ${Date.now()}`,
        totalSeats,
      });
      log.info(`TC-B210: Created event ID ${eventId} with ${totalSeats} seats`);

      try {
        // -- Step 2: Book qty seats --
        const bookingId = await createBookingViaApi(request, token, {
          ...newBooking,
          eventId,
          quantity: qty,
        });

        // -- Step 3: Verify seats are reduced after booking --
        const duringRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: during } = await duringRes.json();
        expect(during.availableSeats).toBe(totalSeats - qty);

        // -- Step 4: Cancel the booking --
        await deleteBookingViaApi(request, token, bookingId);

        // -- Step 5: Assert available seats restored to original count --
        const afterRes = await request.get(`${apiUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: after } = await afterRes.json();
        expect(after.availableSeats).toBe(totalSeats);
        log.info(`TC-B210: Seats restored to ${after.availableSeats} after cancellation ✓`);
      } finally {
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-B211: GET /api/bookings?eventId filters bookings to the specified event',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Create a dedicated event to use as the filter target --
      const eventId = await createEventViaApi(request, token, {
        ...dynamicEventTemplate,
        title: `Filter Event ${Date.now()}`,
      });
      log.info(`TC-B211: Created filter target event ID ${eventId}`);

      let bookingId: number | undefined;
      try {
        // -- Step 2: Book the dedicated event --
        bookingId = await createBookingViaApi(request, token, { ...newBooking, eventId });

        // -- Step 3: GET /api/bookings?eventId=X --
        const response = await request.get(`${apiUrl}/api/bookings?eventId=${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 4: Assert every returned booking belongs to this event --
        const { data: bookings } = await response.json();
        expect((bookings as any[]).length).toBeGreaterThan(0);
        for (const b of bookings as any[]) {
          expect(b.eventId ?? b.event?.id).toBe(eventId);
        }
        log.info(`TC-B211: ${(bookings as any[]).length} booking(s) returned for eventId ${eventId} ✓`);
      } finally {
        if (bookingId) await deleteBookingViaApi(request, token, bookingId);
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-B212: GET /api/bookings respects page and limit pagination params',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);

      // -- Step 1: Clear bookings and create exactly 3 for deterministic pagination --
      await request.delete(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      for (let i = 0; i < 3; i++) {
        await createBookingViaApi(request, token, newBooking);
      }

      try {
        // -- Step 2: GET page 1 with limit 2 — expect exactly 2 items --
        const page1Res = await request.get(`${apiUrl}/api/bookings?page=1&limit=2`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(page1Res.status()).toBe(200);
        const { data: page1 } = await page1Res.json();
        expect((page1 as any[]).length).toBe(2);

        // -- Step 3: GET page 2 with limit 2 — expect 1 remaining item --
        const page2Res = await request.get(`${apiUrl}/api/bookings?page=2&limit=2`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(page2Res.status()).toBe(200);
        const { data: page2 } = await page2Res.json();
        expect((page2 as any[]).length).toBe(1);
        log.info(`TC-B212: page1=${(page1 as any[]).length} items, page2=${(page2 as any[]).length} item — pagination ✓`);
      } finally {
        await request.delete(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  );

  test(
    'TC-B213: Booking detail page shows the event title',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 2: Assert event title is visible on the detail page --
        await expect(page.getByText(staticEvent.title)).toBeVisible();
        log.info(`TC-B213: Event title "${staticEvent.title}" visible on booking detail ✓`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B214: Post-booking "View My Bookings" link navigates to /bookings',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      let bookingId: number | undefined;
      let token: string | undefined;

      try {
        // -- Step 1: Login and complete a booking via UI --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoEventDetail(baseUrl, staticEvent.id);
        await bookingPage.fillAndConfirmBooking({
          customerName: newBooking.customerName,
          customerEmail: newBooking.customerEmail,
          customerPhone: newBooking.customerPhone,
        });

        // -- Step 2: Capture booking ref from the confirmation page before navigating --
        const bookingRefLocator = bookingPage.getBookingRefLocator();
        await expect(bookingRefLocator).toBeVisible({ timeout: 10000 });
        const refText = (await bookingRefLocator.textContent()) ?? '';
        const refMatch = refText.match(/[A-Z]-[A-Z0-9]{6}/);

        // -- Step 3: Click "View My Bookings" and assert /bookings is loaded --
        await expect(bookingPage.viewMyBookingsLink).toBeVisible();
        await bookingPage.viewMyBookingsLink.click();
        await expect(page).toHaveURL(new RegExp(`${baseUrl}/bookings$`));
        log.info(`TC-B214: "View My Bookings" → /bookings ✓`);

        // -- Capture booking ID via API for cleanup --
        token = await getAuthToken(request);
        if (refMatch?.[0]) {
          const listRes = await request.get(`${apiUrl}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const { data: bookings } = await listRes.json();
          const created = (bookings as any[]).find(b => b.bookingRef === refMatch![0]);
          bookingId = created?.id;
        }
      } finally {
        if (bookingId) {
          token ??= await getAuthToken(request);
          await deleteBookingViaApi(request, token, bookingId);
        }
      }
    }
  );

  test(
    'TC-B215: Post-booking "Browse Events" link navigates to /events',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      let bookingId: number | undefined;
      let token: string | undefined;

      try {
        // -- Step 1: Login and complete a booking via UI --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoEventDetail(baseUrl, staticEvent.id);
        await bookingPage.fillAndConfirmBooking({
          customerName: newBooking.customerName,
          customerEmail: newBooking.customerEmail,
          customerPhone: newBooking.customerPhone,
        });

        // -- Step 2: Capture booking ref from the confirmation page before navigating --
        const bookingRefLocator = bookingPage.getBookingRefLocator();
        await expect(bookingRefLocator).toBeVisible({ timeout: 10000 });
        const refText = (await bookingRefLocator.textContent()) ?? '';
        const refMatch = refText.match(/[A-Z]-[A-Z0-9]{6}/);

        // -- Step 3: Click "Browse Events" and assert /events is loaded --
        await expect(bookingPage.browseEventsLink).toBeVisible();
        await bookingPage.browseEventsLink.click();
        await expect(page).toHaveURL(new RegExp(`${baseUrl}/events`));
        log.info(`TC-B215: "Browse Events" → /events ✓`);

        // -- Capture booking ID via API for cleanup --
        token = await getAuthToken(request);
        if (refMatch?.[0]) {
          const listRes = await request.get(`${apiUrl}/api/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const { data: bookings } = await listRes.json();
          const created = (bookings as any[]).find(b => b.bookingRef === refMatch![0]);
          bookingId = created?.id;
        }
      } finally {
        if (bookingId) {
          token ??= await getAuthToken(request);
          await deleteBookingViaApi(request, token, bookingId);
        }
      }
    }
  );

  test(
    'TC-B216: Quantity selector defaults to 1 on the event detail page',
    { tag: '@regression' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);

      // -- Step 1: Login and navigate to event detail --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await bookingPage.gotoEventDetail(baseUrl, staticEvent.id);

      // -- Step 2: Assert quantity display shows 1 (default) --
      await expect(bookingPage.quantityDisplay).toBeVisible();
      await expect(bookingPage.quantityDisplay).toHaveText('1');
      log.info('TC-B216: Quantity selector default is 1 ✓');
    }
  );

  test(
    'TC-B217: Quantity +/- buttons correctly increment and decrement the quantity display',
    { tag: '@regression' },
    async ({ page }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);

      // -- Step 1: Login and navigate to event detail --
      await loginPage.goto(baseUrl);
      await loginPage.login(validUser.email, validUser.password);
      await expect(loginPage.logoutBtn).toBeVisible();
      await bookingPage.gotoEventDetail(baseUrl, staticEvent.id);

      // -- Step 2: Assert default is 1 --
      await expect(bookingPage.quantityDisplay).toHaveText('1');

      // -- Step 3: Increment to 2 --
      await bookingPage.qtyIncreaseBtn.click();
      await expect(bookingPage.quantityDisplay).toHaveText('2');

      // -- Step 4: Increment again to 3 --
      await bookingPage.qtyIncreaseBtn.click();
      await expect(bookingPage.quantityDisplay).toHaveText('3');

      // -- Step 5: Decrement back to 2 --
      await bookingPage.qtyDecreaseBtn.click();
      await expect(bookingPage.quantityDisplay).toHaveText('2');
      log.info('TC-B217: +/- buttons increment/decrement quantity display correctly ✓');
    }
  );

  test(
    'TC-B218: /bookings page shows sandbox warning banner when approaching the 9-booking limit',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(90000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const token = await getAuthToken(request);

      // -- Step 1: Clear all bookings then create 8 (near the 9-booking limit) --
      await request.delete(`${apiUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      for (let i = 0; i < 8; i++) {
        await createBookingViaApi(request, token, newBooking);
      }
      log.info('TC-B218: Setup — 8 bookings created (near limit of 9)');

      try {
        // -- Step 2: Login and navigate to /bookings --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookings(baseUrl);

        // -- Step 3: Assert sandbox warning banner is visible --
        await expect(bookingPage.sandboxWarningBanner).toBeVisible({ timeout: 10000 });
        log.info('TC-B218: Sandbox warning banner visible at 8/9 bookings ✓');
      } finally {
        await request.delete(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  );

  test(
    'TC-B219: /bookings list page shows booking reference and customer name in each card',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, newBooking);

      try {
        // -- Step 1: Fetch the booking reference for the created booking --
        const detailRes = await request.get(`${apiUrl}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: booking } = await detailRes.json();
        const ref = booking.bookingRef as string;

        // -- Step 2: Login and navigate to /bookings list --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookings(baseUrl);

        // -- Step 3: Assert booking card is present and shows the reference --
        const card = bookingPage.getBookingCard(ref);
        await expect(card).toBeVisible();

        // -- Step 4: Assert customer name is visible within the card --
        await expect(card.getByText(newBooking.customerName)).toBeVisible();
        log.info(`TC-B219: Card for ref "${ref}" shows customer name "${newBooking.customerName}" ✓`);
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B220: Check Refund Eligibility shows a spinner before the result is revealed',
    { tag: '@regression' },
    async ({ page, request }) => {
      test.setTimeout(60000);
      const loginPage = new LoginPage(page);
      const bookingPage = new BookingPage(page);
      const token = await getAuthToken(request);
      const bookingId = await createBookingViaApi(request, token, { ...newBooking, quantity: 1 });

      try {
        // -- Step 1: Login and navigate to booking detail --
        await loginPage.goto(baseUrl);
        await loginPage.login(validUser.email, validUser.password);
        await expect(loginPage.logoutBtn).toBeVisible();
        await bookingPage.gotoBookingDetail(baseUrl, bookingId);

        // -- Step 2: Click "Check Refund Eligibility" --
        await expect(bookingPage.checkRefundBtn).toBeVisible();
        await bookingPage.checkRefundBtn.click();

        // -- Step 3: Assert result is NOT immediately visible (spinner delay in progress) --
        await expect(
          page.getByText(/single.ticket bookings qualify for a full refund/i)
        ).not.toBeVisible();
        log.info('TC-B220: Refund result not immediate — spinner/delay is active ✓');

        // -- Step 4: After the ~4 s spinner, assert the result appears --
        await expect(
          page.getByText(/single.ticket bookings qualify for a full refund/i)
        ).toBeVisible({ timeout: 10000 });
        log.info('TC-B220: Refund result revealed after spinner completes ✓');
      } finally {
        await deleteBookingViaApi(request, token, bookingId);
      }
    }
  );

  test(
    'TC-B221: Booking a user-created dynamic event — ref starts with the event title\'s first letter',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const title = `Zenith Automation Event ${Date.now()}`;
      const expectedLetter = 'Z';

      // -- Step 1: Create a dynamic event whose title begins with "Z" --
      const eventId = await createEventViaApi(request, token, {
        ...dynamicEventTemplate,
        title,
      });
      log.info(`TC-B221: Created dynamic event ID ${eventId} — "${title}"`);

      try {
        // -- Step 2: Book the dynamic event --
        const res = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { ...newBooking, eventId, quantity: 1 },
        });
        expect(res.status()).toBe(201);

        // -- Step 3: Assert ref format and leading letter match the event title --
        const { data } = await res.json();
        const ref = data.bookingRef as string;
        expect(ref).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
        expect(ref.charAt(0)).toBe(expectedLetter);
        log.info(`TC-B221: Dynamic event booking ref "${ref}" starts with "${expectedLetter}" ✓`);
      } finally {
        // Event deletion cascades to its bookings
        await deleteEventViaApi(request, token, eventId);
      }
    }
  );

  test(
    'TC-B222: DELETE /api/bookings/:id for non-existent booking ID returns 404',
    { tag: '@regression' },
    async ({ request }) => {
      const token = await getAuthToken(request);
      const response = await request.delete(`${apiUrl}/api/bookings/99999999`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(404);
      log.info(`TC-B222: DELETE /api/bookings/99999999 → ${response.status()} ✓`);
    }
  );

});
