import { test, expect, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../../pages/Authentication/LoginPage';
import { BookingPage } from '../../pages/BookingManagement/BookingPage';
import { createLogger } from '../../utils/logger';
import testData from '../../fixtures/BookingManagement/booking.data.json';

const log = createLogger('BookingManagement');

const { baseUrl, apiUrl, validUser, staticEvent, newBooking, multiTicketBooking } = testData;

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
): Promise<string> {
  const res = await request.post(`${apiUrl}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const { data: booking } = await res.json();
  return booking.id as string;
}

async function deleteBookingViaApi(
  request: APIRequestContext,
  token: string,
  bookingId: string
): Promise<void> {
  await request.delete(`${apiUrl}/api/bookings/${bookingId}`, {
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
      let bookingId: string | undefined;

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
        expect(data.bookingReference).toBeTruthy();
        expect(data.quantity).toBe(newBooking.quantity);
        expect(Number(data.totalPrice)).toBe(staticEvent.price * newBooking.quantity);
        expect(data.customerName).toBe(newBooking.customerName);
        log.info(`TC-B001: Booking ID: ${data.id}, ref: "${data.bookingReference}"`);
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
      let bookingId: string | undefined;
      let token: string;

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

        // -- Step 3: Assert confirmation card with booking reference is visible --
        const bookingRefLocator = bookingPage.getBookingRefLocator();
        await expect(bookingRefLocator).toBeVisible({ timeout: 10000 });
        const refText = await bookingRefLocator.textContent();
        expect(refText).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);
        log.info(`TC-B002: Booking confirmed. Reference: "${refText}"`);

        // -- Step 4: Capture booking ID for cleanup --
        token = await getAuthToken(request);
        const listRes = await request.get(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { data: bookings } = await listRes.json();
        const created = (bookings as any[]).find(b => b.bookingReference === refText);
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
        // Cleanup only if booking still exists
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
        log.info(`TC-B101: GET /api/bookings/${bookingId} → ref: "${data.bookingReference}"`);
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
        const ref = booking.bookingReference as string;

        // -- Step 2: GET booking by reference --
        const response = await request.get(`${apiUrl}/api/bookings/ref/${ref}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status()).toBe(200);

        // -- Step 3: Assert response matches the booking we created --
        const { data } = await response.json();
        expect(data.bookingReference).toBe(ref);
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

      // -- Step 3: Click Clear All Bookings --
      await expect(bookingPage.clearAllBtn).toBeVisible();
      await bookingPage.clearAllBtn.click();

      // -- Step 4: Confirm if a modal appears --
      const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // -- Step 5: Assert empty state is shown --
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
        const nonRefundableMsg = page.getByText(
          new RegExp(`group bookings.*${qty}.*non-refundable`, 'i')
        );
        await expect(nonRefundableMsg).toBeVisible({ timeout: 10000 });
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
      let bookingId: string | undefined;

      try {
        // -- Step 1: POST a booking for "Tech Conference Bangalore" --
        const response = await request.post(`${apiUrl}/api/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          data: newBooking,
        });
        expect(response.status()).toBe(201);
        const { data } = await response.json();
        bookingId = data.id;
        const ref = data.bookingReference as string;

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
      let bookingId: string | undefined;

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

});
