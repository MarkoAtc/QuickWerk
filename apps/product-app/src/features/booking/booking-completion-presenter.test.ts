import { describe, expect, it } from 'vitest';

import { presentBookingCompletion } from './booking-completion-presenter';
import type { BookingContinuationRecord } from './active-job-screen-actions';

const booking: BookingContinuationRecord = {
  bookingId: 'bk-1',
  createdAt: '2026-04-13T20:00:00.000Z',
  customerUserId: 'cust-1',
  providerUserId: 'prov-1',
  requestedService: 'Fix sink',
  status: 'completed',
  statusHistory: [
    {
      changedAt: '2026-04-13T20:00:00.000Z',
      from: 'accepted',
      to: 'completed',
      actorRole: 'provider',
      actorUserId: 'prov-1',
    },
  ],
};

describe('presentBookingCompletion', () => {
  it('builds summary text for payment invoice and reviews', () => {
    const viewModel = presentBookingCompletion({
      booking,
      payment: {
        paymentId: 'pay-1',
        bookingId: 'bk-1',
        amountCents: 12000,
        currency: 'EUR',
        status: 'captured',
      },
      invoice: {
        invoiceId: 'inv-1',
        bookingId: 'bk-1',
        customerUserId: 'cust-1',
        providerUserId: 'prov-1',
        lineItems: [
          {
            description: 'Fix sink',
            quantity: 1,
            unitAmountCents: 10000,
            totalAmountCents: 10000,
          },
        ],
        subtotalCents: 10000,
        taxCents: 2000,
        totalCents: 12000,
        currency: 'EUR',
        status: 'issued',
        issuedAt: '2026-04-13T20:10:00.000Z',
        createdAt: '2026-04-13T20:05:00.000Z',
        pdfUrl: null,
      },
      reviews: [
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
      ],
      warningMessages: ['Payment gateway delay'],
    });

    expect(viewModel.bookingId).toBe('bk-1');
    expect(viewModel.paymentSummary).toContain('EUR 120.00');
    expect(viewModel.invoiceSummary).toContain('Invoice issued');
    expect(viewModel.reviewSummary).toContain('1 review');
    expect(viewModel.latestReviewDetail).toContain('5/5');
    expect(viewModel.statusHistory).toContain('completed at 2026-04-13T20:00:00.000Z');
    expect(viewModel.warningMessages).toEqual(['Payment gateway delay']);
  });
});
