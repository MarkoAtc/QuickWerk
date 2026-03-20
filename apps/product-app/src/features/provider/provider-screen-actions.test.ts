import { describe, expect, it } from 'vitest';

import { acceptBookingRequest } from './provider-screen-actions';

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
