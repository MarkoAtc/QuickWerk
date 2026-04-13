import { describe, expect, it } from 'vitest';

import { loadBookingContinuation } from './active-job-screen-actions';

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
