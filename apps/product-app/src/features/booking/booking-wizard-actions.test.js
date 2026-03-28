import { describe, expect, it, vi } from 'vitest';

import { submitBooking } from './booking-wizard-actions';

describe('submitBooking', () => {
  it('returns auth error when session token is missing', async () => {
    const fetchMock = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await submitBooking(
        { issueType: 'Leaky faucet', urgency: 'today', address: 'Main St', category: 'Plumbing' },
        null,
        'http://localhost:3000',
      );

      expect(result).toMatchObject({ ok: false, error: 'Missing authenticated session token.' });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends authenticated booking request and returns booking payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ bookingId: 'bk-123', status: 'submitted' }),
    }));

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await submitBooking(
        { issueType: 'Leaky faucet', urgency: 'today', address: 'Main St', category: 'Plumbing' },
        'tok-123',
        'http://localhost:3000',
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/bookings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ authorization: 'Bearer tok-123' }),
        }),
      );
      expect(result).toMatchObject({ ok: true, bookingId: 'bk-123', status: 'submitted' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
