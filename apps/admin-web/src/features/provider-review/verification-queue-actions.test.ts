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
  it('loads pending verification queue on success', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => [makeSummary('v-1'), makeSummary('v-2')],
      }) as Response;

    const { loadQueueState } = await import('./verification-queue-actions');
    const next = await loadQueueState('token', fetchImpl as typeof fetch);

    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.verifications.map((v) => v.verificationId)).toEqual(['v-1', 'v-2']);
    expect(next.reviewAction.status).toBe('idle');
  });

  it('applies successful review decision and removes item from queue', async () => {
    const state = createLoadedQueueState([makeSummary('v-1'), makeSummary('v-2')]);

    const fetchImpl = async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://127.0.0.1:3101/api/v1/providers/verifications/v-1/review');
      expect(init?.method).toBe('POST');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...makeSummary('v-1'),
          status: 'approved',
          reviewedAt: '2026-01-01T11:00:00.000Z',
          reviewedByUserId: 'operator-1',
          reviewNote: 'Looks good.',
        }),
      } as Response;
    };

    const next = await submitReviewDecision(state, 'token', 'v-1', 'approved', 'Looks good.', fetchImpl as typeof fetch);

    expect(next.status).toBe('loaded');
    if (next.status !== 'loaded') return;
    expect(next.verifications.map((v) => v.verificationId)).toEqual(['v-2']);
    expect(next.reviewAction).toEqual({
      status: 'done',
      verificationId: 'v-1',
      decision: 'approved',
    });
  });

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

  it('removes stale queue item on 404 not found', async () => {
    const state = createLoadedQueueState([makeSummary('v-1'), makeSummary('v-2')]);

    const fetchImpl = async () =>
      ({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Verification not found.' }),
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
