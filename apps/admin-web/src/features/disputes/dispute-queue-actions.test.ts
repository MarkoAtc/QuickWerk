import { describe, expect, it } from 'vitest';

import type { DisputeRecord } from '@quickwerk/domain';

import { loadDisputeQueueState } from './dispute-queue-actions';

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

describe('dispute-queue-actions', () => {
  it('returns loaded state with disputes on success', async () => {
    const disputes = [makeDispute('d-1'), makeDispute('d-2')];

    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => disputes,
      }) as Response;

    const state = await loadDisputeQueueState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.disputes).toHaveLength(2);
    expect(state.disputes[0]?.disputeId).toBe('d-1');
  });

  it('returns empty state when array is empty', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => [],
      }) as Response;

    const state = await loadDisputeQueueState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('empty');
  });

  it('returns error state on HTTP 403', async () => {
    const fetchImpl = async () =>
      ({
        ok: false,
        status: 403,
        json: async () => ({}),
      }) as Response;

    const state = await loadDisputeQueueState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toContain('403');
  });

  it('returns error state on network throw', async () => {
    const fetchImpl = async (): Promise<Response> => {
      throw new Error('Network unavailable');
    };

    const state = await loadDisputeQueueState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network unavailable');
  });
});
