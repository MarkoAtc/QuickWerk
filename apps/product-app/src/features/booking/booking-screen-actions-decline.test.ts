import { describe, expect, it } from 'vitest';

import { declineBookingRequest } from './booking-screen-actions';

describe('declineBookingRequest', () => {
  it('sends decline reason to the decline endpoint and returns declined booking on success', async () => {
    let fetchInput;
    let fetchInit;
    const fetchMock: typeof fetch = async (input, init) => {
      fetchInput = input;
      fetchInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          bookingId: 'booking-1',
          requestedService: 'Tile repair',
          status: 'declined',
          customerUserId: 'customer-1',
          providerUserId: 'provider-1',
          declineReason: 'Outside service area',
        }),
      } as Response;
    };

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1', declineReason: 'Outside service area' },
      fetchMock,
    );

    expect(fetchInput).toContain('/bookings/booking-1/decline');
    expect(fetchInit).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        authorization: 'Bearer provider-token',
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ declineReason: 'Outside service area' }),
    });
    expect(result.errorMessage).toBeUndefined();
    expect(result.booking).toMatchObject({
      bookingId: 'booking-1',
      status: 'declined',
      declineReason: 'Outside service area',
    });
  });

  it('omits declineReason when provider leaves it blank', async () => {
    let fetchInit;
    const fetchMock: typeof fetch = async (_, init) => {
      fetchInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          bookingId: 'booking-1',
          requestedService: 'Tile repair',
          status: 'declined',
          customerUserId: 'customer-1',
        }),
      } as Response;
    };

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetchMock,
    );

    expect(fetchInit).toMatchObject({
      body: JSON.stringify({}),
    });
    expect(result.booking?.status).toBe('declined');
    expect(result.booking?.declineReason).toBeUndefined();
  });

  it('returns errorMessage on HTTP error', async () => {
    const fetchMock: typeof fetch = async () =>
      ({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Booking already accepted' }),
      }) as Response;

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetchMock,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('409');
  });

  it('returns errorMessage when response is missing required fields', async () => {
    const fetchMock: typeof fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: true }),
      }) as Response;

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetchMock,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });

  it('returns errorMessage on network error', async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error('Network error');
    };

    const result = await declineBookingRequest(
      { sessionToken: 'provider-token', bookingId: 'booking-1' },
      fetchMock,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('Network error');
  });
});
