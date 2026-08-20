import { describe, expect, it, vi } from 'vitest';

import { resolveActiveJobRouteState, resolveBookingIdParam } from './active-job-route-state';
import type { LoadBookingContinuationResult, ProviderIdentitySummary } from './active-job-screen-actions';

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

  it('returns handoff state when booking is completed', async () => {
    const loadImpl = async (): Promise<LoadBookingContinuationResult> => ({
      booking: {
        bookingId: 'bk-complete',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        requestedService: 'Fix sink',
        status: 'completed',
        statusHistory: [],
      },
    });

    const state = await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-complete',
      viewerRole: 'customer',
      loadBookingContinuationImpl: loadImpl,
    });

    expect(state).toEqual({
      status: 'handoff',
      bookingId: 'bk-complete',
    });
  });

  it('fetches provider identity for the customer viewer once a provider is assigned', async () => {
    const loadImpl = async (): Promise<LoadBookingContinuationResult> => ({
      booking: {
        bookingId: 'bk-1',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        providerUserId: 'prov-1',
        requestedService: 'Fix sink',
        status: 'accepted',
        statusHistory: [],
      },
    });

    const identity: ProviderIdentitySummary = { displayName: 'Marcus Hoffman', reviewCount: 0 };
    const loadProviderIdentityImpl = vi.fn().mockResolvedValue(identity);
    const presentActiveJobImpl = vi.fn().mockReturnValue({
      bookingId: 'bk-1',
      status: 'accepted',
      statusLabel: 'Accepted',
      headline: 'Provider assigned',
      subheadline: 'test',
      requestedService: 'Fix sink',
      counterpartLabel: 'Provider',
      counterpartValue: 'prov-1',
      canContactCounterpart: true,
      paymentSummary: 'Payment details are not available yet.',
      timeline: [],
      statusHistory: [],
      providerIdentity: identity,
    });

    const state = await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      viewerRole: 'customer',
      loadBookingContinuationImpl: loadImpl,
      loadProviderIdentityImpl,
      presentActiveJobImpl,
    });

    expect(loadProviderIdentityImpl).toHaveBeenCalledWith({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      providerUserId: 'prov-1',
    });
    expect(presentActiveJobImpl).toHaveBeenCalledWith(expect.objectContaining({ providerIdentity: identity }));
    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.viewModel.providerIdentity).toEqual(identity);
    }
  });

  it('does not fetch provider identity for the provider viewer', async () => {
    const loadImpl = async (): Promise<LoadBookingContinuationResult> => ({
      booking: {
        bookingId: 'bk-1',
        createdAt: '2026-04-13T20:00:00.000Z',
        customerUserId: 'cust-1',
        providerUserId: 'prov-1',
        requestedService: 'Fix sink',
        status: 'accepted',
        statusHistory: [],
      },
    });

    const loadProviderIdentityImpl = vi.fn();
    const presentActiveJobImpl = vi.fn().mockReturnValue({
      bookingId: 'bk-1',
      status: 'accepted',
      statusLabel: 'Accepted',
      headline: 'Customer assigned',
      subheadline: 'test',
      requestedService: 'Fix sink',
      counterpartLabel: 'Customer',
      counterpartValue: 'cust-1',
      canContactCounterpart: true,
      paymentSummary: 'Payment details are not available yet.',
      timeline: [],
      statusHistory: [],
    });

    await resolveActiveJobRouteState({
      sessionToken: 'tok',
      bookingId: 'bk-1',
      viewerRole: 'provider',
      loadBookingContinuationImpl: loadImpl,
      loadProviderIdentityImpl,
      presentActiveJobImpl,
    });

    expect(loadProviderIdentityImpl).not.toHaveBeenCalled();
  });
});
