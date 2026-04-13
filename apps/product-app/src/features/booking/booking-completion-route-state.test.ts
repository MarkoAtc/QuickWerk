import { describe, expect, it } from 'vitest';

import { resolveBookingCompletionRouteState, resolveCompletionBookingIdParam } from './booking-completion-route-state';
import type { LoadBookingCompletionResult } from './booking-completion-screen-actions';

describe('resolveCompletionBookingIdParam', () => {
  it('returns null for missing or blank param', () => {
    expect(resolveCompletionBookingIdParam(undefined)).toBeNull();
    expect(resolveCompletionBookingIdParam('')).toBeNull();
    expect(resolveCompletionBookingIdParam('   ')).toBeNull();
  });

  it('returns first value when param is array', () => {
    expect(resolveCompletionBookingIdParam(['bk-1', 'bk-2'])).toBe('bk-1');
  });
});

describe('resolveBookingCompletionRouteState', () => {
  it('returns error when booking id is missing', async () => {
    const state = await resolveBookingCompletionRouteState({
      sessionToken: 'tok',
      bookingId: null,
    });

    expect(state).toEqual({
      status: 'error',
      errorMessage: 'Missing booking id in route params.',
    });
  });

  it('returns error when loader fails', async () => {
    const loadImpl = async (): Promise<LoadBookingCompletionResult> => ({
      errorMessage: 'Failed to load booking with HTTP 500.',
    });

    const state = await resolveBookingCompletionRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      loadBookingCompletionImpl: loadImpl,
    });

    expect(state).toEqual({
      status: 'error',
      errorMessage: 'Failed to load booking with HTTP 500.',
    });
  });

  it('returns empty when booking is not completed', async () => {
    const loadImpl = async (): Promise<LoadBookingCompletionResult> => ({
      booking: {
        bookingId: 'bk-1',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        requestedService: 'Fix sink',
        status: 'accepted',
        statusHistory: [],
      },
      reviews: [],
      warningMessages: [],
    });

    const state = await resolveBookingCompletionRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      loadBookingCompletionImpl: loadImpl,
    });

    expect(state).toEqual({
      status: 'empty',
      message: 'Completion details will appear once the booking is marked completed.',
      bookingStatus: 'accepted',
    });
  });

  it('returns loaded state and presenter output on success', async () => {
    const loadImpl = async (): Promise<LoadBookingCompletionResult> => ({
      booking: {
        bookingId: 'bk-1',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        requestedService: 'Fix sink',
        status: 'completed',
        statusHistory: [],
      },
      reviews: [],
      warningMessages: [],
    });

    const state = await resolveBookingCompletionRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      loadBookingCompletionImpl: loadImpl,
      presentBookingCompletionImpl: () => ({
        bookingId: 'bk-1',
        headline: 'Booking completed',
        subheadline: 'Done',
        requestedService: 'Fix sink',
        paymentSummary: 'Payment captured',
        invoiceSummary: 'Invoice issued',
        invoiceDetail: 'Issued now.',
        reviewSummary: 'No reviews submitted yet.',
        latestReviewDetail: 'Submit a review to record service quality feedback.',
        latestDisputeSummary: 'No dispute has been opened for this booking.',
        statusHistory: [],
        warningMessages: [],
      }),
    });

    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.viewModel.bookingId).toBe('bk-1');
      expect(state.viewModel.headline).toBe('Booking completed');
    }
  });
});
