import { describe, expect, it } from 'vitest';

import { addPaymentMethodForCheckout, loadCheckoutData, submitCheckout } from './checkout-screen-actions';

const bookingResponse = (status: string, overrides: Record<string, unknown> = {}) => ({
  bookingId: 'bk-1',
  createdAt: '2026-04-13T20:00:00.000Z',
  customerUserId: 'cust-1',
  providerUserId: 'prov-1',
  requestedService: 'Fix sink',
  status,
  statusHistory: [],
  ...overrides,
});

const quoteResponse = () => ({
  quoteId: 'quote-1',
  bookingId: 'bk-1',
  lineItems: [{ label: 'Base Call-out Fee', amountCents: 4500 }],
  calloutFeeCents: 4500,
  laborCents: 17000,
  platformFeeCents: 1250,
  totalCents: 22750,
  currency: 'EUR',
  pricingTableVersion: 'v1',
  createdAt: '2026-04-13T20:00:00.000Z',
  expiresAt: '2026-04-13T20:15:00.000Z',
});

const paymentMethodResponse = () => ({
  paymentMethodId: 'pm-1',
  customerUserId: 'cust-1',
  label: 'Visa',
  last4: '4242',
  brand: 'visa',
  source: 'simulated',
  createdAt: '2026-04-13T19:00:00.000Z',
});

describe('loadCheckoutData', () => {
  it('hands off to booking-completion when the booking is already completed', async () => {
    const fetchMock: typeof fetch = async (url) => {
      if (url.toString().includes('/payment')) return { ok: false, status: 404 } as Response;
      return { ok: true, status: 200, json: async () => bookingResponse('completed') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);
    expect(result).toEqual({ status: 'handoff', target: 'booking-completion' });
  });

  it('hands off to active-job when the booking is not yet accepted', async () => {
    const fetchMock: typeof fetch = async (url) => {
      if (url.toString().includes('/payment')) return { ok: false, status: 404 } as Response;
      return { ok: true, status: 200, json: async () => bookingResponse('submitted') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);
    expect(result).toEqual({ status: 'handoff', target: 'active-job' });
  });

  it('hands off to active-job when the accepted booking already has a captured payment, without requesting a quote', async () => {
    let quoteRequested = false;
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/payment-methods')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (href.includes('/payment')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ paymentId: 'pay-1', bookingId: 'bk-1', amountCents: 22750, currency: 'EUR', status: 'captured' }),
        } as Response;
      }
      if (href.includes('/quote')) {
        quoteRequested = true;
        return { ok: true, status: 200, json: async () => quoteResponse() } as Response;
      }
      return { ok: true, status: 200, json: async () => bookingResponse('accepted') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);
    expect(result).toEqual({ status: 'handoff', target: 'active-job' });
    expect(quoteRequested).toBe(false);
  });

  it('hands off to active-job when the quote request 409s (booking transitioned mid-load)', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/payment-methods')) return { ok: true, status: 200, json: async () => [] } as Response;
      if (href.includes('/payment')) return { ok: false, status: 404 } as Response;
      if (href.includes('/quote')) return { ok: false, status: 409 } as Response;
      return { ok: true, status: 200, json: async () => bookingResponse('accepted') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);
    expect(result).toEqual({ status: 'handoff', target: 'active-job' });
  });

  it('loads the quote and payment methods for an accepted, unpaid booking', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/payment-methods')) return { ok: true, status: 200, json: async () => [paymentMethodResponse()] } as Response;
      if (href.includes('/payment')) return { ok: false, status: 404 } as Response;
      if (href.includes('/quote')) return { ok: true, status: 200, json: async () => quoteResponse() } as Response;
      return { ok: true, status: 200, json: async () => bookingResponse('accepted') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;
    // Matches pricing-table.test.ts's known plumbing/scheduled value -- the client renders
    // the server's number, it never re-derives one.
    expect(result.quote.totalCents).toBe(22750);
    expect(result.paymentMethods).toHaveLength(1);
    expect(result.paymentMethods[0]?.last4).toBe('4242');
  });

  it('surfaces a load error (not a silent empty list) when the payment-methods request fails', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const href = url.toString();
      if (href.includes('/payment-methods')) return { ok: false, status: 500 } as Response;
      if (href.includes('/payment')) return { ok: false, status: 404 } as Response;
      if (href.includes('/quote')) return { ok: true, status: 200, json: async () => quoteResponse() } as Response;
      return { ok: true, status: 200, json: async () => bookingResponse('accepted') } as Response;
    };

    const result = await loadCheckoutData({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);

    // Must not resolve to 'loaded' with paymentMethods: [] -- that would look identical
    // to "you have no cards yet" and point the customer at "Add new card" when they may
    // already have one and the request simply failed.
    expect(result.status).toBe('error');
  });
});

describe('addPaymentMethodForCheckout', () => {
  it('sends a fixed Visa label/brand and returns the created record', async () => {
    let sentBody: unknown;
    const fetchMock: typeof fetch = async (_url, init) => {
      sentBody = init?.body ? JSON.parse(init.body as string) : undefined;
      return { ok: true, status: 201, json: async () => paymentMethodResponse() } as Response;
    };

    const result = await addPaymentMethodForCheckout('tok', fetchMock);

    expect(sentBody).toEqual({ label: 'Visa', brand: 'visa' });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.paymentMethod.label).toBe('Visa');
    expect(result.paymentMethod.brand).toBe('visa');
  });

  it('returns an error result on a non-OK response', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 500 } as Response);
    const result = await addPaymentMethodForCheckout('tok', fetchMock);
    expect(result.status).toBe('error');
  });
});

describe('submitCheckout', () => {
  it('returns success with the paymentId on a 200 response', async () => {
    const fetchMock: typeof fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ paymentId: 'pay-1', bookingId: 'bk-1', amountCents: 22750, currency: 'EUR', status: 'captured' }),
    } as Response);

    const result = await submitCheckout(
      { sessionToken: 'tok', bookingId: 'bk-1', quoteId: 'quote-1', paymentMethodId: 'pm-1' },
      fetchMock,
    );

    expect(result).toEqual({ status: 'success', paymentId: 'pay-1' });
  });

  it('returns needs-reload on a 409 (covers both expired-quote and no-longer-accepted causes)', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 409 } as Response);
    const result = await submitCheckout(
      { sessionToken: 'tok', bookingId: 'bk-1', quoteId: 'quote-1', paymentMethodId: 'pm-1' },
      fetchMock,
    );
    expect(result).toEqual({ status: 'needs-reload' });
  });

  it('returns an inline error (not a crash) on a 403 (payment method rejected)', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 403 } as Response);
    const result = await submitCheckout(
      { sessionToken: 'tok', bookingId: 'bk-1', quoteId: 'quote-1', paymentMethodId: 'pm-1' },
      fetchMock,
    );
    expect(result.status).toBe('error');
  });
});
