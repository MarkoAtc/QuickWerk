import { describe, expect, it } from 'vitest';

import type { DisputeRecord } from '@quickwerk/domain';

import {
  applyDisputeTransitionSuccess,
  beginOptimisticDisputeTransition,
  createEmptyState,
  createErrorState,
  createLoadedState,
  createLoadingState,
  rollbackDisputeTransition,
} from './dispute-queue-state';

const makeDispute = (id: string): DisputeRecord => ({
  disputeId: id,
  bookingId: `booking-${id}`,
  reporterUserId: `user-${id}`,
  reporterRole: 'customer',
  category: 'quality',
  description: 'Service was unsatisfactory.',
  status: 'open',
  createdAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: null,
  resolutionNote: null,
});

describe('dispute-queue-state', () => {
  it('createLoadingState returns loading status', () => {
    expect(createLoadingState().status).toBe('loading');
  });

  it('createEmptyState returns empty status', () => {
    expect(createEmptyState().status).toBe('empty');
  });

  it('createLoadedState contains disputes', () => {
    const state = createLoadedState([makeDispute('d-1')]);
    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.disputes).toHaveLength(1);
    expect(state.disputes[0]?.disputeId).toBe('d-1');
    expect(state.queueAction.status).toBe('idle');
  });

  it('createErrorState stores error message', () => {
    const state = createErrorState('Network failed');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network failed');
  });

  it('applies optimistic start review transition', () => {
    const state = createLoadedState([makeDispute('d-1')]);
    const next = beginOptimisticDisputeTransition(state, 'd-1', 'startReview');
    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.disputes[0]?.status).toBe('under-review');
    expect(next.queueAction).toEqual({
      status: 'transitioning',
      disputeId: 'd-1',
      actionType: 'startReview',
    });
  });

  it('removes resolved disputes from queue on success', () => {
    const state = createLoadedState([makeDispute('d-1')]);
    const next = applyDisputeTransitionSuccess(
      state,
      {
        ...makeDispute('d-1'),
        status: 'resolved',
        resolvedAt: '2026-01-02T10:00:00.000Z',
        resolutionNote: 'Resolved',
      },
      'resolve',
    );
    expect(next.status).toBe('empty');
  });

  it('rolls back optimistic state with action error', () => {
    const previous = createLoadedState([makeDispute('d-1')]);
    const optimistic = beginOptimisticDisputeTransition(previous, 'd-1', 'close');
    const rolledBack = rollbackDisputeTransition(optimistic, previous, 'd-1', 'close', 'HTTP 409');
    expect(rolledBack.status).toBe('loaded');
    if (rolledBack.status !== 'loaded') return;
    expect(rolledBack.disputes[0]?.status).toBe('open');
    expect(rolledBack.queueAction).toEqual({
      status: 'error',
      disputeId: 'd-1',
      actionType: 'close',
      errorMessage: 'HTTP 409',
    });
  });
});
