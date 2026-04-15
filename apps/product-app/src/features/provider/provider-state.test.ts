import { describe, expect, it } from 'vitest';

import {
  createAcceptedProviderScreenState,
  createAcceptingProviderScreenState,
  createDeclineErrorProviderScreenState,
  createDeclinedProviderScreenState,
  createDecliningProviderScreenState,
  createErrorProviderScreenState,
  createIdleProviderScreenState,
} from './provider-state';

describe('provider screen state helpers', () => {
  it('returns idle state with idle accept/decline states', () => {
    const state = createIdleProviderScreenState('bk-001', 'Too far away');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-001',
      acceptState: { status: 'idle', bookingId: 'bk-001' },
      declineState: { status: 'idle', bookingId: 'bk-001', declineReason: 'Too far away' },
    });
  });

  it('returns accepting state with accepting accept state', () => {
    const state = createAcceptingProviderScreenState('bk-002', 'Already booked');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-002',
      acceptState: { status: 'accepting', bookingId: 'bk-002' },
      declineState: { status: 'idle', bookingId: 'bk-002', declineReason: 'Already booked' },
    });
  });

  it('returns accepted state with updated status', () => {
    const state = createAcceptedProviderScreenState('bk-003', 'accepted', 'Optional draft');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-003',
      acceptState: { status: 'accepted', bookingId: 'bk-003', updatedStatus: 'accepted' },
      declineState: { status: 'idle', bookingId: 'bk-003', declineReason: 'Optional draft' },
    });
  });

  it('returns declining state with decline draft preserved', () => {
    const state = createDecliningProviderScreenState('bk-004', 'Outside service area');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-004',
      acceptState: { status: 'idle', bookingId: 'bk-004' },
      declineState: { status: 'declining', bookingId: 'bk-004', declineReason: 'Outside service area' },
    });
  });

  it('returns declined state with updated status and reason', () => {
    const state = createDeclinedProviderScreenState('bk-005', 'declined', 'Outside service area');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-005',
      acceptState: { status: 'idle', bookingId: 'bk-005' },
      declineState: {
        status: 'declined',
        bookingId: 'bk-005',
        updatedStatus: 'declined',
        declineReason: 'Outside service area',
      },
    });
  });

  it('returns error state when accept fails', () => {
    const state = createErrorProviderScreenState('bk-006', 'Accept booking failed with HTTP 403.', 'Keep this draft');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-006',
      acceptState: { status: 'error', bookingId: 'bk-006', errorMessage: 'Accept booking failed with HTTP 403.' },
      declineState: { status: 'idle', bookingId: 'bk-006', declineReason: 'Keep this draft' },
    });
  });

  it('returns error state when decline fails', () => {
    const state = createDeclineErrorProviderScreenState('bk-007', 'Outside service area', 'Decline booking failed with HTTP 409.');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-007',
      acceptState: { status: 'idle', bookingId: 'bk-007' },
      declineState: {
        status: 'error',
        bookingId: 'bk-007',
        declineReason: 'Outside service area',
        errorMessage: 'Decline booking failed with HTTP 409.',
      },
    });
  });
});
