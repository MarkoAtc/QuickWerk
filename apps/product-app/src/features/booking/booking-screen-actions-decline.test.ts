import { describe, expect, it } from 'vitest';

import { declineBookingRequest } from './booking-screen-actions';

const mockFetch =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);

describe('declineBookingRequest', () => {
  it('returns declined booking on success', async () => {
    const fetch = mockFetch(200, {
      bookingId: 'booking-1',
      requestedService: 'Tile repair',
      status: 'declined',
      customerUserId: 'customer-1',
      providerUserId: 'provider-1',
      declineReason: 'Outside service area',
    });

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1', declineReason: 'Outside service area' },
      fetch,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.status).toBe('declined');
    expect(result.booking?.declineReason).toBe('Outside service area');
  });

  it('returns errorMessage on HTTP error', async () => {
    const fetch = mockFetch(409, { message: 'Booking already accepted' });

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('409');
  });

  it('returns errorMessage when response is missing required fields', async () => {
    const fetch = mockFetch(200, { unexpected: true });

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });

  it('returns errorMessage on network error', async () => {
    const fetch = () => Promise.reject(new Error('Network error'));

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetch as unknown as typeof globalThis.fetch,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('Network error');
  });
});
