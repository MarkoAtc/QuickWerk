import { describe, expect, it } from 'vitest';

import {
  loadBookingCompletion,
  submitBookingCompletionDispute,
  submitBookingCompletionReview,
} from './booking-completion-screen-actions';

describe('loadBookingCompletion', () => {
  it('loads booking payment invoice and reviews when requests succeed', async () => {
    const fetchMock: typeof fetch = async (url) => {
      const path = url.toString();

      if (path.includes('/payment')) {
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

      if (path.includes('/invoice')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            invoiceId: 'inv-1',
            bookingId: 'bk-1',
            customerUserId: 'cust-1',
            providerUserId: 'prov-1',
            lineItems: [{ description: 'Fix sink', quantity: 1, unitAmountCents: 10000, totalAmountCents: 10000 }],
            subtotalCents: 10000,
            taxCents: 2000,
            totalCents: 12000,
            currency: 'EUR',
            status: 'issued',
            issuedAt: '2026-04-13T20:10:00.000Z',
            createdAt: '2026-04-13T20:05:00.000Z',
            pdfUrl: null,
          }),
        } as Response;
      }

      if (path.includes('/reviews')) {
        return {
          ok: true,
          status: 200,
          json: async () => ([
            {
              reviewId: 'rev-1',
              bookingId: 'bk-1',
              customerUserId: 'cust-1',
              providerUserId: 'prov-1',
              authorRole: 'customer',
              rating: 5,
              comment: 'Great service',
              status: 'submitted',
              createdAt: '2026-04-13T20:20:00.000Z',
            },
          ]),
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
          status: 'completed',
          statusHistory: [],
        }),
      } as Response;
    };

    const result = await loadBookingCompletion({ sessionToken: 'tok', bookingId: 'bk-1' }, fetchMock);

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.bookingId).toBe('bk-1');
    expect(result.payment?.paymentId).toBe('pay-1');
    expect(result.invoice?.invoiceId).toBe('inv-1');
    expect(result.reviews).toHaveLength(1);
    expect(result.warningMessages).toEqual([]);
  });

  it('returns non-completed booking without invoice/review lookups', async () => {
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
          status: 'accepted',
          statusHistory: [],
        }),
      } as Response;
    };

    const result = await loadBookingCompletion({ sessionToken: 'tok', bookingId: 'bk-2' }, fetchMock);

    expect(result.errorMessage).toBeUndefined();
    expect(result.booking?.status).toBe('accepted');
    expect(result.invoice).toBeUndefined();
    expect(result.reviews).toEqual([]);
  });
});

describe('submitBookingCompletionReview', () => {
  it('returns review on success', async () => {
    const fetchMock: typeof fetch = async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        reviewId: 'rev-1',
        bookingId: 'bk-1',
        customerUserId: 'cust-1',
        providerUserId: 'prov-1',
        authorRole: 'customer',
        rating: 5,
        comment: 'Great service',
        status: 'submitted',
        createdAt: '2026-04-13T20:20:00.000Z',
      }),
    } as Response);

    const result = await submitBookingCompletionReview(
      { sessionToken: 'tok', bookingId: 'bk-1', rating: 5, comment: 'Great service' },
      fetchMock,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.review?.reviewId).toBe('rev-1');
  });

  it('returns error on non-ok response', async () => {
    const fetchMock: typeof fetch = async () => ({ ok: false, status: 500 } as Response);

    const result = await submitBookingCompletionReview(
      { sessionToken: 'tok', bookingId: 'bk-1', rating: 5 },
      fetchMock,
    );

    expect(result.review).toBeUndefined();
    expect(result.errorMessage).toContain('500');
  });
});

describe('submitBookingCompletionDispute', () => {
  it('returns dispute on success', async () => {
    const fetchMock: typeof fetch = async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        disputeId: 'disp-1',
        bookingId: 'bk-1',
        reporterUserId: 'cust-1',
        reporterRole: 'customer',
        category: 'quality',
        description: 'Work quality issue',
        status: 'open',
        createdAt: '2026-04-13T20:30:00.000Z',
        resolvedAt: null,
        resolutionNote: null,
      }),
    } as Response);

    const result = await submitBookingCompletionDispute(
      {
        sessionToken: 'tok',
        bookingId: 'bk-1',
        category: 'quality',
        description: 'Work quality issue',
      },
      fetchMock,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.dispute?.disputeId).toBe('disp-1');
  });

  it('returns error on thrown fetch error', async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error('Network down');
    };

    const result = await submitBookingCompletionDispute(
      {
        sessionToken: 'tok',
        bookingId: 'bk-1',
        category: 'quality',
        description: 'Work quality issue',
      },
      fetchMock,
    );

    expect(result.dispute).toBeUndefined();
    expect(result.errorMessage).toBe('Network down');
  });
});
