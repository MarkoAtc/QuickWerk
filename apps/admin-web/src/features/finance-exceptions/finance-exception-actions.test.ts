import { describe, expect, it } from 'vitest';

import { loadFinanceExceptionState, submitFinanceExceptionTriage } from './finance-exception-actions';

const makeDispute = (overrides: Partial<Record<string, unknown>> = {}) => ({
  disputeId: 'dispute-1',
  bookingId: 'booking-1',
  reporterUserId: 'customer-1',
  reporterRole: 'customer',
  category: 'billing',
  description: 'Payout blocked by settlement hold.',
  status: 'open',
  createdAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: null,
  resolutionNote: null,
  ...overrides,
});

describe('finance-exception-actions', () => {
  it('returns loaded state with billing exceptions', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => [makeDispute()],
      }) as Response;

    const state = await loadFinanceExceptionState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;

    expect(state.exceptions).toHaveLength(1);
    expect(state.exceptions[0]?.anomalyType).toBe('payout-blocked');
    expect(state.exceptions[0]?.resolutionState).toBe('new');
    expect(state.queueAction.status).toBe('idle');
  });

  it('returns empty state when there are no billing disputes', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => [makeDispute({ category: 'quality' })],
      }) as Response;

    const state = await loadFinanceExceptionState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('empty');
  });

  it('returns error state when pending disputes request fails', async () => {
    const fetchImpl = async () =>
      ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }) as Response;

    const state = await loadFinanceExceptionState('token', fetchImpl as typeof fetch);

    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toContain('500');
  });

  it('routes follow-up triage to dispute review', async () => {
    const initialState = await loadFinanceExceptionState(
      'token',
      (async () =>
        ({
          ok: true,
          status: 200,
          json: async () => [makeDispute()],
        }) as Response) as typeof fetch,
    );

    expect(initialState.status).toBe('loaded');
    if (initialState.status !== 'loaded') return;

    const fetchImpl = async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://127.0.0.1:3101/api/v1/disputes/dispute-1/start-review');
      expect(init?.method).toBe('PATCH');

      return {
        ok: true,
        status: 200,
        json: async () => makeDispute({ status: 'under-review' }),
      } as Response;
    };

    const next = await submitFinanceExceptionTriage(
      initialState,
      'token',
      initialState.exceptions[0]!.exceptionId,
      'followUp',
      fetchImpl as typeof fetch,
    );

    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.exceptions[0]?.disputeStatus).toBe('under-review');
    expect(next.exceptions[0]?.resolutionState).toBe('manual-review');
    expect(next.queueAction).toEqual({
      status: 'done',
      exceptionId: initialState.exceptions[0]!.exceptionId,
      disputeId: 'dispute-1',
      actionType: 'followUp',
    });
  });
});
