import { describe, expect, it, vi } from 'vitest';

import {
  acceptBookingRequest,
  declineProviderBookingRequest,
  listBookingsRequest,
  loadProviderDashboardData,
} from './provider-screen-actions';

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
            customerLocation: '1010 Vienna, AT',
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
      customerLocation: '1010 Vienna, AT',
    });
  });

  it('sends the resolved provider token as a bearer header', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }) as Response);

    await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/bookings'),
      expect.objectContaining({
        method: 'GET',
        headers: { authorization: 'Bearer tok-provider' },
      }),
    );
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

  it('rejects malformed booking rows instead of rendering blank actions', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [
          {
            bookingId: '',
            status: 'submitted',
            requestedService: 'Fix the boiler',
            createdAt: '2026-03-20T10:00:00.000Z',
            customerUserId: 'usr-001',
          },
        ],
      }) as Response;

    const result = await listBookingsRequest('tok-provider', fetchMock as typeof fetch);

    expect(result).toEqual({ errorMessage: 'Booking list response missing required fields.' });
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

describe('declineProviderBookingRequest', () => {
  it('sends the existing authenticated JSON decline contract', async () => {
    const fetchMock = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          bookingId: 'bk-001',
          status: 'declined',
          requestedService: 'Fix the boiler',
          customerUserId: 'usr-001',
        }),
      }) as Response);

    const result = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      fetchMock as typeof fetch,
    );

    expect(result.booking).toMatchObject({ bookingId: 'bk-001', status: 'declined' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/bookings/bk-001/decline'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer tok-provider',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
    );
  });

  it('rejects non-declined and malformed responses', async () => {
    const wrongStatus = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () =>
        ({
          ok: true,
          json: async () => ({ bookingId: 'bk-001', status: 'accepted' }),
        }) as Response,
    );
    expect(wrongStatus.errorMessage).toContain("Expected status 'declined'");

    const malformed = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () => ({ ok: true, json: async () => ({ status: 'declined' }) }) as Response,
    );
    expect(malformed).toEqual({ errorMessage: 'Decline booking response missing required fields.' });
  });

  it('rejects a declined response for a different booking', async () => {
    const result = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () =>
        ({
          ok: true,
          json: async () => ({ bookingId: 'bk-other', status: 'declined' }),
        }) as Response,
    );

    expect(result).toEqual({ errorMessage: 'Decline booking response did not match the requested booking.' });
  });

  it('surfaces HTTP and network failures', async () => {
    const httpFailure = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () => ({ ok: false, status: 409 }) as Response,
    );
    expect(httpFailure).toEqual({ errorMessage: 'Decline booking failed with HTTP 409.' });

    const networkFailure = await declineProviderBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () => {
        throw new Error('Network request failed');
      },
    );
    expect(networkFailure).toEqual({ errorMessage: 'Network request failed' });
  });
});

describe('loadProviderDashboardData', () => {
  const approvedVerification = {
    verificationId: 'verification-1',
    status: 'approved',
    submittedAt: '2026-03-20T09:00:00.000Z',
    tradeCategories: ['electrical'],
    documents: [],
  };

  const providerProfile = {
    providerUserId: 'provider-1',
    displayName: 'Marcus Weber',
    tradeCategories: ['electrical'],
    isPublic: true,
    photoUrl: 'https://example.test/marcus.jpg',
    createdAt: '2026-03-20T08:00:00.000Z',
    updatedAt: '2026-03-20T08:30:00.000Z',
  };

  const booking = {
    bookingId: 'bk-001',
    status: 'submitted',
    requestedService: 'Short circuit repair',
    customerLocation: '1010 Vienna, AT',
    createdAt: '2026-03-20T10:00:00.000Z',
    customerUserId: 'customer-1',
  };

  it('loads verification/profile context before the approved request queue', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/providers/me/verification')) {
        return { ok: true, json: async () => approvedVerification } as Response;
      }
      if (url.endsWith('/api/v1/providers/me/profile')) {
        return { ok: true, status: 200, json: async () => providerProfile } as Response;
      }
      if (url.endsWith('/api/v1/bookings')) {
        return { ok: true, json: async () => [booking] } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadProviderDashboardData('tok-provider', fetchMock as typeof fetch);

    expect(result).toMatchObject({
      status: 'loaded',
      profile: providerProfile,
      bookings: [booking],
    });
    const bookingCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/api/v1/bookings'));
    expect(bookingCall?.[1]).toMatchObject({ headers: { authorization: 'Bearer tok-provider' } });
  });

  it('keeps unapproved providers gated without loading bookings', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/providers/me/verification')) {
        return { ok: true, json: async () => ({ status: 'not-submitted' }) } as Response;
      }
      if (url.endsWith('/api/v1/providers/me/profile')) {
        return { ok: true, status: 200, json: async () => providerProfile } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadProviderDashboardData('tok-provider', fetchMock as typeof fetch);

    expect(result).toMatchObject({ status: 'blocked', profile: providerProfile });
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/v1/bookings'))).toBe(false);
  });

  it('degrades a profile failure without suppressing an approved request queue', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/providers/me/verification')) {
        return { ok: true, json: async () => approvedVerification } as Response;
      }
      if (url.endsWith('/api/v1/providers/me/profile')) {
        return { ok: false, status: 503 } as Response;
      }
      if (url.endsWith('/api/v1/bookings')) {
        return { ok: true, json: async () => [booking] } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadProviderDashboardData('tok-provider', fetchMock as typeof fetch);

    expect(result).toMatchObject({
      status: 'loaded',
      profile: null,
      profileWarning: 'Load profile failed with HTTP 503.',
      bookings: [booking],
    });
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

  it('rejects a response with the wrong booking or transition status', async () => {
    const wrongBooking = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () =>
        ({
          ok: true,
          json: async () => ({ bookingId: 'bk-other', status: 'accepted' }),
        }) as Response,
    );
    expect(wrongBooking).toEqual({ errorMessage: 'Accept booking response did not match the requested booking.' });

    const wrongStatus = await acceptBookingRequest(
      { sessionToken: 'tok-provider', bookingId: 'bk-001' },
      async () =>
        ({
          ok: true,
          json: async () => ({ bookingId: 'bk-001', status: 'submitted' }),
        }) as Response,
    );
    expect(wrongStatus).toEqual({ errorMessage: "Expected status 'accepted' but received 'submitted'." });
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
