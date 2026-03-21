import { describe, expect, it } from 'vitest';

import { submitBookingRequest } from './booking-screen-actions';

describe('submitBookingRequest', () => {
  it('returns created booking on success', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          bookingId: 'bk-001',
          requestedService: 'Fix the boiler',
          status: 'submitted',
          customerUserId: 'usr-001',
        }),
      }) as Response;

    const result = await submitBookingRequest(
      { sessionToken: 'tok-abc', requestedService: 'Fix the boiler' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({
      booking: {
        bookingId: 'bk-001',
        requestedService: 'Fix the boiler',
        status: 'submitted',
      },
    });
    expect(result.errorMessage).toBeUndefined();
  });

  it('returns error on non-OK response', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 403,
      }) as Response;

    const result = await submitBookingRequest(
      { sessionToken: 'tok-abc', requestedService: 'Fix the boiler' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Booking request failed with HTTP 403.' });
    expect(result.booking).toBeUndefined();
  });

  it('returns error when response is missing bookingId', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ status: 'submitted' }),
      }) as Response;

    const result = await submitBookingRequest(
      { sessionToken: 'tok-abc', requestedService: 'Fix the boiler' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Booking response missing required fields.' });
    expect(result.booking).toBeUndefined();
  });

  it('returns error when fetch throws', async () => {
    const fetchMock = async () => {
      throw new Error('Network request failed');
    };

    const result = await submitBookingRequest(
      { sessionToken: 'tok-abc', requestedService: 'Fix the boiler' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Network request failed' });
    expect(result.booking).toBeUndefined();
  });
});
