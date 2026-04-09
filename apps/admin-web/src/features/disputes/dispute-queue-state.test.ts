import { describe, expect, it } from 'vitest';

import type { DisputeRecord } from '@quickwerk/domain';

import {
  createEmptyState,
  createErrorState,
  createLoadedState,
  createLoadingState,
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
  });

  it('createErrorState stores error message', () => {
    const state = createErrorState('Network failed');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network failed');
  });
});
