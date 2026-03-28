import { describe, expect, it } from 'vitest';

import {
  VerificationSummary,
  applyReviewDecision,
  createEmptyQueueState,
  createLoadedQueueState,
  createLoadingQueueState,
  createQueueErrorState,
} from './verification-queue-state';

const makeSummary = (id: string): VerificationSummary => ({
  verificationId: id,
  providerUserId: `provider-${id}`,
  providerEmail: `provider-${id}@example.com`,
  tradeCategories: ['plumbing'],
  documents: [],
  status: 'pending',
  submittedAt: '2026-01-01T10:00:00.000Z',
});

describe('verification-queue-state', () => {
  it('createLoadingQueueState returns loading status', () => {
    expect(createLoadingQueueState().status).toBe('loading');
  });

  it('createEmptyQueueState returns empty status', () => {
    expect(createEmptyQueueState().status).toBe('empty');
  });

  it('createLoadedQueueState contains verifications and idle review action', () => {
    const state = createLoadedQueueState([makeSummary('v-1')]);
    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.verifications).toHaveLength(1);
    expect(state.reviewAction.status).toBe('idle');
  });

  it('createQueueErrorState stores error message', () => {
    const state = createQueueErrorState('Network failed');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network failed');
  });

  describe('applyReviewDecision', () => {
    it('removes reviewed verification from list and sets done action', () => {
      const state = createLoadedQueueState([makeSummary('v-1'), makeSummary('v-2')]);
      const next = applyReviewDecision(state, 'v-1', 'approved');

      expect(next.status).toBe('loaded');
      if (next.status !== 'loaded') return;
      expect(next.verifications).toHaveLength(1);
      expect(next.verifications[0]?.verificationId).toBe('v-2');
      expect(next.reviewAction.status).toBe('done');
      if (next.reviewAction.status !== 'done') return;
      expect(next.reviewAction.decision).toBe('approved');
    });

    it('removes rejected verification', () => {
      const state = createLoadedQueueState([makeSummary('v-1')]);
      const next = applyReviewDecision(state, 'v-1', 'rejected');
      if (next.status !== 'loaded') return;
      expect(next.verifications).toHaveLength(0);
      expect(next.reviewAction.status).toBe('done');
      if (next.reviewAction.status !== 'done') return;
      expect(next.reviewAction.decision).toBe('rejected');
    });

    it('does not modify non-loaded states', () => {
      const loadingState = createLoadingQueueState();
      const result = applyReviewDecision(loadingState, 'v-1', 'approved');
      expect(result.status).toBe('loading');
    });
  });
});
