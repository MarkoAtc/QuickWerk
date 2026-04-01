import { describe, expect, it } from 'vitest';

import { completeBookingRequest } from './booking-screen-actions';

const mockFetch =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);

describe('completeBookingRequest', () => {
  it('returns completed booking on success', async () => {
    const fetch = mockFetch(200, {
      booking: {
        bookingId: 'booking-1',
        requestedService: 'Tile repair',
        status: 'completed',
        customerUserId: 'customer-1',
      },
      payment: {
        paymentId: 'payment-1',
        bookingId: 'booking-1',
        status: 'captured',
        amountCents: 0,
        currency: 'EUR',
      },
    });

    const result = await completeBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.status).toBe('completed');
    expect(result.booking?.bookingId).toBe('booking-1');
  });

  it('returns errorMessage on HTTP 403', async () => {
    const fetch = mockFetch(403, { message: 'Forbidden' });

    const result = await completeBookingRequest(
      { sessionToken: 'customer-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('403');
  });

  it('returns errorMessage on HTTP 409', async () => {
    const fetch = mockFetch(409, { message: 'Conflict' });

    const result = await completeBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('409');
  });

  it('returns errorMessage when booking payload is missing required fields', async () => {
    const fetch = mockFetch(200, { booking: { unexpected: true }, payment: {} });

    const result = await completeBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toBeDefined();
  });

  it('returns errorMessage on fetch error', async () => {
    const fetch = () => Promise.reject(new Error('Network failure'));

    const result = await completeBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch as typeof globalThis.fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('Network failure');
  });
});
