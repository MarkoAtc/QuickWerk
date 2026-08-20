import { describe, expect, it } from 'vitest';

import { loadBookingContinuation, loadProviderIdentity } from './active-job-screen-actions';

describe('loadBookingContinuation', () => {
  it('loads booking and payment details when both requests succeed', async () => {
    const fetchMock: typeof fetch = async (url) => {
      if (url.toString().includes('/payment')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            paymentId: 'pay-1',
            bookingId: 'bk-1',
            amountCents: 12000,
            currency: 'EUR',
            status: 'captured',
          }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          bookingId: 'bk-1',
          createdAt: '2026-04-13T20:00:00.000Z',
          customerUserId: 'cust-1',
          providerUserId: 'prov-1',
          requestedService: 'Fix sink',
          status: 'accepted',
          statusHistory: [],
        }),
      } as Response;
    };

    const result = await loadBookingContinuation(
      { sessionToken: 'tok-1', bookingId: 'bk-1' },
      fetchMock,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.bookingId).toBe('bk-1');
    expect(result.payment?.status).toBe('captured');
  });

  it('returns booking without payment when payment endpoint returns 404', async () => {
    const fetchMock: typeof fetch = async (url) => {
      if (url.toString().includes('/payment')) {
        return { ok: false, status: 404 } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          bookingId: 'bk-2',
          createdAt: '2026-04-13T20:00:00.000Z',
          customerUserId: 'cust-1',
          requestedService: 'Fix sink',
          status: 'submitted',
          statusHistory: [],
        }),
      } as Response;
    };

    const result = await loadBookingContinuation(
      { sessionToken: 'tok-1', bookingId: 'bk-2' },
      fetchMock,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.bookingId).toBe('bk-2');
    expect(result.payment).toBeUndefined();
    expect(result.warningMessage).toBeUndefined();
  });

  it('returns error on booking HTTP failure', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 500 } as Response);

    const result = await loadBookingContinuation(
      { sessionToken: 'tok-1', bookingId: 'bk-3' },
      fetchMock,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toContain('500');
  });

  it('returns error on thrown fetch error', async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error('Network down');
    };

    const result = await loadBookingContinuation(
      { sessionToken: 'tok-1', bookingId: 'bk-4' },
      fetchMock,
    );

    expect(result.booking).toBeUndefined();
    expect(result.errorMessage).toBe('Network down');
  });
});

describe('loadProviderIdentity', () => {
  const baseInput = { sessionToken: 'tok-1', bookingId: 'bk-1', providerUserId: 'prov-1' };

  it('combines booking-scoped identity, average rating, and contact phone when all requests succeed', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ rating: 5 }, { rating: 4 }],
        } as Response;
      }

      if (href.includes('/contact')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ phone: '+15550002222' }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          displayName: 'Marcus Hoffman',
          photoUrl: 'https://storage.stub/photo.jpg',
          vehicleDescription: 'White VW Transporter',
          licensePlate: 'B-HW-2024',
        }),
      } as Response;
    };

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity).toEqual({
      displayName: 'Marcus Hoffman',
      photoUrl: 'https://storage.stub/photo.jpg',
      vehicleDescription: 'White VW Transporter',
      licensePlate: 'B-HW-2024',
      averageRating: 4.5,
      reviewCount: 2,
      phone: '+15550002222',
    });
  });

  it('omits phone when the contact request returns no phone (counterpart has none on file)', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/reviews')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }

      if (href.includes('/contact')) {
        return { ok: true, status: 200, json: async () => ({ phone: null }) } as Response;
      }

      return { ok: true, status: 200, json: async () => ({ displayName: 'Marcus Hoffman' }) } as Response;
    };

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity?.phone).toBeUndefined();
  });

  it('omits phone when the contact request fails (e.g. not yet accepted)', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/reviews')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }

      if (href.includes('/contact')) {
        return { ok: false, status: 403 } as Response;
      }

      return { ok: true, status: 200, json: async () => ({ displayName: 'Marcus Hoffman' }) } as Response;
    };

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity?.phone).toBeUndefined();
    expect(identity?.displayName).toBe('Marcus Hoffman');
  });

  it('returns identity with no rating when reviews request fails', async () => {
    const fetchMock: typeof fetch = async (url) => {
      if (url.toString().includes('/reviews')) {
        return { ok: false, status: 500 } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ displayName: 'Marcus Hoffman' }),
      } as Response;
    };

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity).toEqual({
      displayName: 'Marcus Hoffman',
      photoUrl: undefined,
      vehicleDescription: undefined,
      licensePlate: undefined,
      averageRating: undefined,
      reviewCount: 0,
    });
  });

  it('returns null when the booking is not yet accepted (endpoint returns non-ok)', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 403 } as Response);

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity).toBeNull();
  });

  it('returns null on thrown fetch error', async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error('Network down');
    };

    const identity = await loadProviderIdentity(baseInput, fetchMock);

    expect(identity).toBeNull();
  });
});
