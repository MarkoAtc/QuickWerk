import { describe, expect, it } from 'vitest';

import { acceptBookingRequest, listBookingsRequest } from './provider-screen-actions';

describe('listBookingsRequest', () => {
  it('returns array of booking summaries on success', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [
          {
            bookingId: 'bk-001',
            status: 'submitted',
            requestedService: 'Fix the boiler',
            createdAt: '2026-03-20T10:00:00.000Z',
            customerUserId: 'usr-001',
          },
          {
            bookingId: 'bk-002',
            status: 'submitted',
            requestedService: 'Install shelves',
            createdAt: '2026-03-20T11:00:00.000Z',
            customerUserId: 'usr-002',
          },
        ],
      }) as Response;

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.bookings).toHaveLength(2);
    expect(result.bookings?.[0]).toMatchObject({
      bookingId: 'bk-001',
      status: 'submitted',
      requestedService: 'Fix the boiler',
    });
  });

  it('returns empty array when no bookings exist', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [],
      }) as Response;

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.bookings).toEqual([]);
  });

  it('returns error on non-OK response', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 401,
      }) as Response;

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result.errorMessage).toMatch('401');
    expect(result.bookings).toBeUndefined();
  });

  it('returns error when response is not an array', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ error: 'unexpected shape' }),
      }) as Response;

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result.errorMessage).toMatch(/not an array/);
    expect(result.bookings).toBeUndefined();
  });

  it('returns error when fetch throws', async () => {
    const fetchMock = async () => {
      throw new Error('Network failure');
    };

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result.errorMessage).toBe('Network failure');
    expect(result.bookings).toBeUndefined();
  });
});

describe('acceptBookingRequest', () => {
  it('returns accepted booking on success', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          bookingId: 'bk-001',
          status: 'accepted',
          requestedService: 'Fix the boiler',
          customerUserId: 'usr-001',
          providerUserId: 'usr-002',
        }),
      }) as Response;

    const result = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({
      booking: {
        bookingId: 'bk-001',
        status: 'accepted',
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

    const result = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Accept booking failed with HTTP 403.' });
    expect(result.booking).toBeUndefined();
  });

  it('returns error when server signals rejection via ok: false', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ ok: false, error: 'transition-conflict' }),
      }) as Response;

    const result = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'transition-conflict' });
    expect(result.booking).toBeUndefined();
  });

  it('returns error when response is missing bookingId', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ status: 'accepted' }),
      }) as Response;

    const result = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Accept booking response missing required fields.' });
    expect(result.booking).toBeUndefined();
  });

  it('returns error when fetch throws', async () => {
    const fetchMock = async () => {
      throw new Error('Network request failed');
    };

    const result = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Network request failed' });
    expect(result.booking).toBeUndefined();
  });
});
