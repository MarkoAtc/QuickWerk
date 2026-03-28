import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryProviderProfileRepository } from './infrastructure/in-memory-provider-profile.repository';
import { InMemoryProviderVerificationRepository } from './infrastructure/in-memory-provider-verification.repository';
import { ProvidersService } from './providers.service';

const makeService = () => {
  const repo = new InMemoryProviderVerificationRepository();
  const service = new ProvidersService(repo, new InMemoryProviderProfileRepository());
  return { service, repo };
};

const makeSession = (role: 'customer' | 'provider' | 'operator', userId = 'user-1'): AuthSession => ({
  createdAt: '2026-01-01T09:00:00.000Z',
  expiresAt: '2026-01-02T09:00:00.000Z',
  email: `${role}@example.com`,
  role,
  token: `token-${userId}`,
  userId,
});

const baseInput = {
  businessName: 'Pipe Dream Ltd.',
  tradeCategories: ['plumbing'],
  serviceArea: 'Vienna',
  documents: [{ filename: 'cert.pdf', mimeType: 'application/pdf', description: 'Certificate' }],
};

describe('ProvidersService.submitVerification', () => {
  it('provider can submit verification successfully', async () => {
    const { service } = makeService();
    const session = makeSession('provider');
    const result = await service.submitVerification(session, baseInput, { correlationId: 'corr-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.statusCode).toBe(201);
    expect(result.verification.status).toBe('pending');
    expect(result.verification.providerUserId).toBe('user-1');
    expect(result.verification.documents).toHaveLength(1);
  });

  it('customer cannot submit verification', async () => {
    const { service } = makeService();
    const session = makeSession('customer');
    const result = await service.submitVerification(session, baseInput, { correlationId: 'corr-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('operator cannot submit verification', async () => {
    const { service } = makeService();
    const session = makeSession('operator');
    const result = await service.submitVerification(session, baseInput, { correlationId: 'corr-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('provider cannot submit duplicate pending verification', async () => {
    const { service } = makeService();
    const session = makeSession('provider');

    await service.submitVerification(session, baseInput, { correlationId: 'corr-1' });
    const result = await service.submitVerification(session, baseInput, { correlationId: 'corr-2' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(409);
  });
});

describe('ProvidersService.getMyVerificationStatus', () => {
  it('provider sees pending status after submission', async () => {
    const { service } = makeService();
    const session = makeSession('provider');

    await service.submitVerification(session, baseInput, { correlationId: 'corr-1' });
    const statusResult = await service.getMyVerificationStatus(session, { correlationId: 'corr-2' });

    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;
    expect(statusResult.verification?.status).toBe('pending');
  });

  it('provider gets null when no submission exists', async () => {
    const { service } = makeService();
    const session = makeSession('provider');

    const statusResult = await service.getMyVerificationStatus(session, { correlationId: 'corr-1' });

    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;
    expect(statusResult.verification).toBeNull();
  });

  it('customer cannot check provider verification status', async () => {
    const { service } = makeService();
    const session = makeSession('customer');
    const result = await service.getMyVerificationStatus(session, { correlationId: 'corr-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });
});

describe('ProvidersService.listPendingVerifications', () => {
  it('operator can list pending verifications', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');
    const operatorSession = makeSession('operator', 'op-1');

    await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });

    const result = await service.listPendingVerifications(operatorSession, { correlationId: 'corr-2' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.verifications).toHaveLength(1);
  });

  it('customer cannot list pending verifications', async () => {
    const { service } = makeService();
    const session = makeSession('customer');
    const result = await service.listPendingVerifications(session, { correlationId: 'corr-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('provider cannot list pending verifications', async () => {
    const { service } = makeService();
    const session = makeSession('provider');
    const result = await service.listPendingVerifications(session, { correlationId: 'corr-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });
});

describe('ProvidersService.reviewVerification', () => {
  it('operator can approve a pending verification', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');
    const operatorSession = makeSession('operator', 'op-1');

    const submitResult = await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });
    if (!submitResult.ok) throw new Error('Submission failed');

    const reviewResult = await service.reviewVerification(
      operatorSession,
      submitResult.verification.verificationId,
      { decision: 'approved', reviewNote: 'All good' },
      { correlationId: 'corr-2' },
    );

    expect(reviewResult.ok).toBe(true);
    if (!reviewResult.ok) return;
    expect(reviewResult.verification.status).toBe('approved');
    expect(reviewResult.verification.reviewedByUserId).toBe('op-1');
  });

  it('operator can reject a pending verification', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');
    const operatorSession = makeSession('operator', 'op-1');

    const submitResult = await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });
    if (!submitResult.ok) throw new Error('Submission failed');

    const reviewResult = await service.reviewVerification(
      operatorSession,
      submitResult.verification.verificationId,
      { decision: 'rejected', reviewNote: 'Missing trade license' },
      { correlationId: 'corr-2' },
    );

    expect(reviewResult.ok).toBe(true);
    if (!reviewResult.ok) return;
    expect(reviewResult.verification.status).toBe('rejected');
  });

  it('provider cannot review verifications', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');

    const submitResult = await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });
    if (!submitResult.ok) throw new Error('Submission failed');

    const reviewResult = await service.reviewVerification(
      providerSession,
      submitResult.verification.verificationId,
      { decision: 'approved' },
      { correlationId: 'corr-2' },
    );

    expect(reviewResult.ok).toBe(false);
    if (reviewResult.ok) return;
    expect(reviewResult.statusCode).toBe(403);
  });

  it('returns 404 for unknown verification id', async () => {
    const { service } = makeService();
    const operatorSession = makeSession('operator', 'op-1');

    const result = await service.reviewVerification(
      operatorSession,
      'no-such-id',
      { decision: 'approved' },
      { correlationId: 'corr-1' },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns 409 when trying to review an already-decided verification', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');
    const operatorSession = makeSession('operator', 'op-1');

    const submitResult = await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });
    if (!submitResult.ok) throw new Error('Submission failed');

    await service.reviewVerification(
      operatorSession,
      submitResult.verification.verificationId,
      { decision: 'approved' },
      { correlationId: 'corr-2' },
    );

    const secondReviewResult = await service.reviewVerification(
      operatorSession,
      submitResult.verification.verificationId,
      { decision: 'rejected' },
      { correlationId: 'corr-3' },
    );

    expect(secondReviewResult.ok).toBe(false);
    if (secondReviewResult.ok) return;
    expect(secondReviewResult.statusCode).toBe(409);
  });

  it('provider sees approved status after operator approval', async () => {
    const { service } = makeService();
    const providerSession = makeSession('provider', 'prov-1');
    const operatorSession = makeSession('operator', 'op-1');

    const submitResult = await service.submitVerification(providerSession, baseInput, { correlationId: 'corr-1' });
    if (!submitResult.ok) throw new Error('Submission failed');

    await service.reviewVerification(
      operatorSession,
      submitResult.verification.verificationId,
      { decision: 'approved' },
      { correlationId: 'corr-2' },
    );

    // Provider polls their own status
    const statusResult = await service.getMyVerificationStatus(providerSession, { correlationId: 'corr-3' });
    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;
    expect(statusResult.verification?.status).toBe('approved');
  });
});
