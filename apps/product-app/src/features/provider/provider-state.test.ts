import { describe, expect, it } from 'vitest';

import {
  createAcceptedProviderScreenState,
  createAcceptingProviderScreenState,
  createErrorProviderScreenState,
  createIdleProviderScreenState,
} from './provider-state';

describe('provider screen state helpers', () => {
  it('returns idle state with idle accept state', () => {
    const state = createIdleProviderScreenState('bk-001');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-001',
      acceptState: { status: 'idle', bookingId: 'bk-001' },
    });
  });

  it('returns accepting state with accepting accept state', () => {
    const state = createAcceptingProviderScreenState('bk-002');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-002',
      acceptState: { status: 'accepting', bookingId: 'bk-002' },
    });
  });

  it('returns accepted state with updated status', () => {
    const state = createAcceptedProviderScreenState('bk-003', 'accepted');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-003',
      acceptState: { status: 'accepted', bookingId: 'bk-003', updatedStatus: 'accepted' },
    });
  });

  it('returns error state when accept fails', () => {
    const state = createErrorProviderScreenState('bk-004', 'Accept booking failed with HTTP 403.');
    expect(state).toMatchObject({
      status: 'idle',
      bookingId: 'bk-004',
      acceptState: { status: 'error', bookingId: 'bk-004', errorMessage: 'Accept booking failed with HTTP 403.' },
    });
  });
});
