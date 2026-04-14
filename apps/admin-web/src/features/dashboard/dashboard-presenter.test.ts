import { describe, expect, it } from 'vitest';

import type { DisputeRecord } from '@quickwerk/domain';

import { describeDisputeQueue, describeFinanceExceptionQueue, describeVerificationQueue } from './dashboard-presenter';
import { createErrorState, createLoadedState, createLoadingState } from '../disputes/dispute-queue-state';
import {
  createFinanceErrorState,
  createFinanceLoadedState,
  createFinanceLoadingState,
} from '../finance-exceptions/finance-exception-state';
import {
  createLoadedQueueState,
  createLoadingQueueState,
  createQueueErrorState,
} from '../provider-review/verification-queue-state';

const verification = {
  verificationId: 'verification-1',
  providerUserId: 'provider-1',
  providerEmail: 'provider@example.com',
  tradeCategories: ['plumbing'],
  documents: [],
  status: 'pending' as const,
  submittedAt: '2026-01-01T10:00:00.000Z',
};

const dispute = {
  disputeId: 'dispute-1',
  bookingId: 'booking-1',
  reporterUserId: 'customer-1',
  reporterRole: 'customer',
  category: 'quality',
  description: 'Service incomplete',
  status: 'open',
  createdAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: null,
  resolutionNote: null,
} satisfies DisputeRecord;

const financeException = {
  exceptionId: 'finance-dispute-1',
  disputeId: 'dispute-1',
  bookingId: 'booking-1',
  providerUserId: 'unknown-provider',
  customerUserId: 'customer-1',
  anomalyType: 'invoice-missing' as const,
  anomalyReason: 'Missing invoice after payout was created.',
  disputeStatus: 'open' as const,
  reportedAt: '2026-01-01T10:00:00.000Z',
  resolutionState: 'new' as const,
};

describe('dashboard-presenter', () => {
  it('describes verification loading state', () => {
    expect(describeVerificationQueue(createLoadingQueueState())).toEqual({
      badge: 'loading',
      headline: 'Loading provider verification queue…',
      detail: 'Operator queue state is still being fetched.',
    });
  });

  it('describes verification empty state', () => {
    expect(describeVerificationQueue({ status: 'empty' })).toEqual({
      badge: 'clear',
      headline: 'No provider verifications are waiting.',
      detail: 'The onboarding review queue is currently empty.',
    });
  });

  it('describes verification error state', () => {
    expect(describeVerificationQueue(createQueueErrorState('HTTP 500'))).toEqual({
      badge: 'error',
      headline: 'Provider verification queue failed to load.',
      detail: 'HTTP 500',
    });
  });

  it('describes verification loaded state', () => {
    expect(describeVerificationQueue(createLoadedQueueState([verification]))).toEqual({
      badge: '1 pending',
      headline: 'Provider verification queue is live.',
      detail: 'Approve or reject pending provider onboarding submissions.',
    });
  });

  it('describes dispute loading state', () => {
    expect(describeDisputeQueue(createLoadingState())).toEqual({
      badge: 'loading',
      headline: 'Loading dispute queue…',
      detail: 'Open customer/provider disputes are still being fetched.',
    });
  });

  it('describes dispute empty state', () => {
    expect(describeDisputeQueue({ status: 'empty' })).toEqual({
      badge: 'clear',
      headline: 'No active disputes need review.',
      detail: 'The operator dispute queue is currently empty.',
    });
  });

  it('describes dispute error state', () => {
    expect(describeDisputeQueue(createErrorState('HTTP 403'))).toEqual({
      badge: 'error',
      headline: 'Dispute queue failed to load.',
      detail: 'HTTP 403',
    });
  });

  it('describes dispute loaded state', () => {
    expect(describeDisputeQueue(createLoadedState([dispute]))).toEqual({
      badge: '1 pending',
      headline: 'Dispute queue is live.',
      detail: 'Move disputes through review, resolution, or closure.',
    });
  });

  it('describes finance loading state', () => {
    expect(describeFinanceExceptionQueue(createFinanceLoadingState())).toEqual({
      badge: 'loading',
      headline: 'Loading finance/support exceptions…',
      detail: 'Payout and invoice anomaly signals are still being fetched.',
    });
  });

  it('describes finance empty state', () => {
    expect(describeFinanceExceptionQueue({ status: 'empty' })).toEqual({
      badge: 'clear',
      headline: 'No finance/support exceptions need review.',
      detail: 'No payout/invoice billing anomalies are currently active.',
    });
  });

  it('describes finance error state', () => {
    expect(describeFinanceExceptionQueue(createFinanceErrorState('HTTP 500'))).toEqual({
      badge: 'error',
      headline: 'Finance/support exceptions failed to load.',
      detail: 'HTTP 500',
    });
  });

  it('describes finance loaded state', () => {
    expect(describeFinanceExceptionQueue(createFinanceLoadedState([financeException]))).toEqual({
      badge: '1 pending',
      headline: 'Finance/support exception cockpit is live.',
      detail: 'Acknowledge anomalies, mark follow-up, or route into dispute/manual review.',
    });
  });
});
