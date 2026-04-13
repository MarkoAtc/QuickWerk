import { describe, expect, it } from 'vitest';

import { resolveActiveJobRouteState, resolveBookingIdParam } from './active-job-route-state';
import type { LoadBookingContinuationResult } from './active-job-screen-actions';

describe('resolveBookingIdParam', () => {
  it('returns null for missing or blank param', () => {
    expect(resolveBookingIdParam(undefined)).toBeNull();
    expect(resolveBookingIdParam('')).toBeNull();
    expect(resolveBookingIdParam('  ')).toBeNull();
  });

  it('returns first value when param is array', () => {
    expect(resolveBookingIdParam(['bk-1', 'bk-2'])).toBe('bk-1');
  });
});

describe('resolveActiveJobRouteState', () => {
  it('returns error when booking id is missing', async () => {
    const state = await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: null,
      viewerRole: 'customer',
    });

    expect(state).toEqual({
      status: 'error',
      errorMessage: 'Missing booking id in route params.',
    });
  });

  it('returns error when loader fails', async () => {
    const loadImpl = async (): Promise<LoadBookingContinuationResult> => ({
      errorMessage: 'Failed to load booking with HTTP 500.',
    });

    const state = await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      viewerRole: 'customer',
      loadBookingContinuationImpl: loadImpl,
    });

    expect(state).toEqual({
      status: 'error',
      errorMessage: 'Failed to load booking with HTTP 500.',
    });
  });

  it('returns loaded state and presenter output on success', async () => {
    const loadImpl = async (): Promise<LoadBookingContinuationResult> => ({
      booking: {
        bookingId: 'bk-1',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        requestedService: 'Fix sink',
        status: 'submitted',
        statusHistory: [],
      },
    });

    const state = await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      viewerRole: 'customer',
      loadBookingContinuationImpl: loadImpl,
      presentActiveJobImpl: () => ({
        bookingId: 'bk-1',
        status: 'submitted',
        statusLabel: 'Submitted',
        headline: 'Booking submitted',
        subheadline: 'test',
        requestedService: 'Fix sink',
        counterpartLabel: 'Provider',
        counterpartValue: 'Not assigned yet',
        canContactCounterpart: false,
        paymentSummary: 'Payment details are not available yet.',
        timeline: [],
        statusHistory: [],
      }),
    });

    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.viewModel.bookingId).toBe('bk-1');
      expect(state.viewModel.headline).toBe('Booking submitted');
    }
  });
});