import { describe, expect, it } from 'vitest';

import { submitReviewDecision } from './verification-queue-actions';
import { createLoadedQueueState } from './verification-queue-state';

const makeSummary = (id: string) => ({
  verificationId: id,
  providerUserId: `provider-${id}`,
  providerEmail: `provider-${id}@example.com`,
  tradeCategories: ['plumbing'],
  documents: [],
  status: 'pending' as const,
  submittedAt: '2026-01-01T10:00:00.000Z',
});

describe('verification-queue-actions', () => {
  it('removes stale queue item on 409 review conflict', async () => {
    const state = createLoadedQueueState([makeSummary('v-1'), makeSummary('v-2')]);

    const fetchImpl = async () =>
      ({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Already decided.' }),
      }) as Response;

    const next = await submitReviewDecision(state, 'token', 'v-1', 'approved', undefined, fetchImpl as typeof fetch);

    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.verifications.map((v) => v.verificationId)).toEqual(['v-2']);
    expect(next.reviewAction.status).toBe('error');
  });

  it('keeps queue item on generic review error', async () => {
    const state = createLoadedQueueState([makeSummary('v-1')]);

    const fetchImpl = async () =>
      ({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error.' }),
      }) as Response;

    const next = await submitReviewDecision(state, 'token', 'v-1', 'approved', undefined, fetchImpl as typeof fetch);

    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.verifications.map((v) => v.verificationId)).toEqual(['v-1']);
    expect(next.reviewAction.status).toBe('error');
  });
});
