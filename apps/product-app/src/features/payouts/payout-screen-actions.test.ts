import { describe, expect, it } from 'vitest';

import { loadMyPayouts } from './payout-screen-actions';

const mockFetch =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);

describe('loadMyPayouts', () => {
  it('returns loaded state with payouts on success', async () => {
    const payouts = [
      {
        payoutId: 'payout-1',
        providerUserId: 'provider-1',
        bookingId: 'booking-1',
        paymentId: 'payment-1',
        amountCents: 5000,
        currency: 'EUR',
        status: 'pending',
        settlementRef: null,
        createdAt: '2026-04-01T12:00:00.000Z',
        settledAt: null,
      },
    ];

    const fetch = mockFetch(200, payouts);
    const result = await loadMyPayouts('provider-token', fetch);

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.payouts).toHaveLength(1);
      expect(result.payouts[0].payoutId).toBe('payout-1');
      expect(result.payouts[0].amountCents).toBe(5000);
    }
  });

  it('returns loaded state with empty array when no payouts', async () => {
    const fetch = mockFetch(200, []);
    const result = await loadMyPayouts('provider-token', fetch);

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.payouts).toHaveLength(0);
    }
  });

  it('returns error state on non-OK response', async () => {
    const fetch = mockFetch(403, { message: 'Forbidden' });
    const result = await loadMyPayouts('customer-token', fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('403');
    }
  });

  it('returns error state on 401 response', async () => {
    const fetch = mockFetch(401, { message: 'Unauthorized' });
    const result = await loadMyPayouts('expired-token', fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('401');
    }
  });

  it('returns error state when fetch throws', async () => {
    const fetch = () => Promise.reject(new Error('Network failure'));
    const result = await loadMyPayouts('provider-token', fetch as typeof globalThis.fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('Network failure');
    }
  });
});
