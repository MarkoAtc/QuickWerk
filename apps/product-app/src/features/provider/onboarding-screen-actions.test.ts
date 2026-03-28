import { describe, expect, it, vi } from 'vitest';

import { VerificationRecord } from './onboarding-state';
import { fetchVerificationStatus, loadOnboardingStatus, submitOnboarding, submitVerificationRequest } from './onboarding-screen-actions';

const makeRecord = (status: 'pending' | 'approved' | 'rejected'): VerificationRecord => ({
  verificationId: 'ver-1',
  status,
  submittedAt: '2026-01-01T10:00:00.000Z',
  tradeCategories: ['plumbing'],
  documents: [],
  businessName: 'Acme Services',
  serviceArea: 'Vienna',
});

const makeMockFetch = (status: number, body: unknown): typeof fetch => {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  return fn as unknown as typeof fetch;
};

const baseFormData = {
  businessName: 'Acme Services',
  tradeCategories: ['plumbing'],
  serviceArea: 'Vienna',
  documents: [{ filename: 'cert.pdf', mimeType: 'application/pdf' }],
};

describe('fetchVerificationStatus', () => {
  it('returns null verification when server returns not-submitted', async () => {
    const mockFetch = makeMockFetch(200, { status: 'not-submitted' });
    const result = await fetchVerificationStatus('tok-1', mockFetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.verification).toBeNull();
  });

  it('returns verification record when server returns a record', async () => {
    const record = makeRecord('pending');
    const mockFetch = makeMockFetch(200, record);
    const result = await fetchVerificationStatus('tok-1', mockFetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.verification?.status).toBe('pending');
  });

  it('returns error message on non-ok response', async () => {
    const mockFetch = makeMockFetch(401, {});
    const result = await fetchVerificationStatus('tok-1', mockFetch);

    expect(result.errorMessage).toBeDefined();
  });

  it('returns error message on network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network down')) as unknown as typeof fetch;
    const result = await fetchVerificationStatus('tok-1', mockFetch);

    expect(result.errorMessage).toBe('Network down');
  });
});

describe('submitVerificationRequest', () => {
  it('returns verification on successful submission', async () => {
    const record = makeRecord('pending');
    const mockFetch = makeMockFetch(201, record);
    const result = await submitVerificationRequest('tok-1', baseFormData, mockFetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.verification?.status).toBe('pending');
  });

  it('returns error on conflict response', async () => {
    const mockFetch = makeMockFetch(409, { message: 'A pending verification already exists.' });
    const result = await submitVerificationRequest('tok-1', baseFormData, mockFetch);

    expect(result.errorMessage).toBeDefined();
    expect(result.verification).toBeUndefined();
  });
});

describe('loadOnboardingStatus', () => {
  it('returns not-submitted state when no record', async () => {
    const mockFetch = makeMockFetch(200, { status: 'not-submitted' });
    const state = await loadOnboardingStatus('tok-1', mockFetch);

    expect(state.status).toBe('not-submitted');
  });

  it('returns pending state for pending record', async () => {
    const mockFetch = makeMockFetch(200, makeRecord('pending'));
    const state = await loadOnboardingStatus('tok-1', mockFetch);

    expect(state.status).toBe('pending');
  });

  it('returns approved state for approved record', async () => {
    const mockFetch = makeMockFetch(200, makeRecord('approved'));
    const state = await loadOnboardingStatus('tok-1', mockFetch);

    expect(state.status).toBe('approved');
  });

  it('returns error state on fetch failure', async () => {
    const mockFetch = makeMockFetch(500, {});
    const state = await loadOnboardingStatus('tok-1', mockFetch);

    expect(state.status).toBe('error');
  });
});

describe('submitOnboarding', () => {
  it('returns pending state on successful submission', async () => {
    const mockFetch = makeMockFetch(201, makeRecord('pending'));
    const state = await submitOnboarding('tok-1', baseFormData, mockFetch);

    expect(state.status).toBe('pending');
  });

  it('returns error state on server rejection', async () => {
    const mockFetch = makeMockFetch(409, { message: 'Duplicate pending verification.' });
    const state = await submitOnboarding('tok-1', baseFormData, mockFetch);

    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toContain('Duplicate');
  });
});
