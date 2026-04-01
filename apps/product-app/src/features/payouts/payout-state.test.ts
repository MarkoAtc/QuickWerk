import { describe, expect, it } from 'vitest';

import type { PayoutRecord } from '@quickwerk/domain';

import { initialPayoutLoadState } from './payout-state';
import type { PayoutLoadState } from './payout-state';

const makePayoutRecord = (overrides: Partial<PayoutRecord> = {}): PayoutRecord => ({
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
  ...overrides,
});

describe('PayoutLoadState', () => {
  it('initialPayoutLoadState has idle status', () => {
    expect(initialPayoutLoadState.status).toBe('idle');
  });

  it('loaded state contains payout records', () => {
    const state: PayoutLoadState = { status: 'loaded', payouts: [makePayoutRecord()] };

    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.payouts).toHaveLength(1);
      expect(state.payouts[0].payoutId).toBe('payout-1');
      expect(state.payouts[0].amountCents).toBe(5000);
      expect(state.payouts[0].currency).toBe('EUR');
      expect(state.payouts[0].status).toBe('pending');
    }
  });

  it('error state contains a message', () => {
    const state: PayoutLoadState = { status: 'error', message: 'Network failure' };

    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.message).toBe('Network failure');
    }
  });

  it('loading state has correct status', () => {
    const state: PayoutLoadState = { status: 'loading' };
    expect(state.status).toBe('loading');
  });

  it('loaded state with empty payouts array is valid', () => {
    const state: PayoutLoadState = { status: 'loaded', payouts: [] };
    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.payouts).toHaveLength(0);
    }
  });
});
