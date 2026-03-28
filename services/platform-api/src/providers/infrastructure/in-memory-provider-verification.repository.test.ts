import { describe, expect, it } from 'vitest';

import { InMemoryProviderVerificationRepository } from './in-memory-provider-verification.repository';

describe('InMemoryProviderVerificationRepository', () => {
  const makeRepo = () => new InMemoryProviderVerificationRepository();

  const baseSubmit = {
    providerUserId: 'provider-1',
    providerEmail: 'provider@example.com',
    businessName: 'Acme Services',
    tradeCategories: ['plumbing', 'tiling'],
    serviceArea: 'Vienna 1st district',
    documents: [{ filename: 'trade-cert.pdf', mimeType: 'application/pdf', description: 'Trade certificate' }],
    submittedAt: '2026-01-01T10:00:00.000Z',
  };

  it('creates a pending verification with correct fields', async () => {
    const repo = makeRepo();
    const record = await repo.submitVerification(baseSubmit);

    expect(record.verificationId).toBeDefined();
    expect(record.status).toBe('pending');
    expect(record.providerUserId).toBe('provider-1');
    expect(record.documents).toHaveLength(1);
    expect(record.documents[0]?.filename).toBe('trade-cert.pdf');
    expect(record.documents[0]?.documentId).toBeDefined();
    expect(record.statusHistory).toHaveLength(1);
    expect(record.statusHistory[0]?.to).toBe('pending');
    expect(record.statusHistory[0]?.from).toBeNull();
  });

  it('retrieves a verification by id', async () => {
    const repo = makeRepo();
    const created = await repo.submitVerification(baseSubmit);
    const found = await repo.getVerification(created.verificationId);

    expect(found).not.toBeNull();
    expect(found?.verificationId).toBe(created.verificationId);
  });

  it('returns null for unknown verification id', async () => {
    const repo = makeRepo();
    const found = await repo.getVerification('unknown-id');
    expect(found).toBeNull();
  });

  it('retrieves a verification by provider user id', async () => {
    const repo = makeRepo();
    const created = await repo.submitVerification(baseSubmit);
    const found = await repo.getVerificationByProviderId('provider-1');

    expect(found?.verificationId).toBe(created.verificationId);
  });

  it('returns null when no verification exists for provider', async () => {
    const repo = makeRepo();
    const found = await repo.getVerificationByProviderId('no-such-provider');
    expect(found).toBeNull();
  });

  it('lists only pending verifications', async () => {
    const repo = makeRepo();
    const v1 = await repo.submitVerification({ ...baseSubmit, providerUserId: 'p-1', providerEmail: 'p1@example.com' });
    const v2 = await repo.submitVerification({ ...baseSubmit, providerUserId: 'p-2', providerEmail: 'p2@example.com' });

    // Approve v1
    await repo.reviewVerification({
      verificationId: v1.verificationId,
      reviewedByUserId: 'op-1',
      reviewedByRole: 'operator',
      decision: 'approved',
      reviewedAt: '2026-01-01T12:00:00.000Z',
    });

    const pending = await repo.listPendingVerifications();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.verificationId).toBe(v2.verificationId);
  });

  it('approves a pending verification', async () => {
    const repo = makeRepo();
    const created = await repo.submitVerification(baseSubmit);

    const result = await repo.reviewVerification({
      verificationId: created.verificationId,
      reviewedByUserId: 'op-1',
      reviewedByRole: 'operator',
      decision: 'approved',
      reviewNote: 'Looks good',
      reviewedAt: '2026-01-01T12:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.record.status).toBe('approved');
    expect(result.record.reviewedByUserId).toBe('op-1');
    expect(result.record.reviewNote).toBe('Looks good');
    expect(result.record.statusHistory).toHaveLength(2);
    expect(result.record.statusHistory[1]?.from).toBe('pending');
    expect(result.record.statusHistory[1]?.to).toBe('approved');
  });

  it('rejects a pending verification', async () => {
    const repo = makeRepo();
    const created = await repo.submitVerification(baseSubmit);

    const result = await repo.reviewVerification({
      verificationId: created.verificationId,
      reviewedByUserId: 'op-1',
      reviewedByRole: 'operator',
      decision: 'rejected',
      reviewNote: 'Documents incomplete',
      reviewedAt: '2026-01-01T12:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.status).toBe('rejected');
  });

  it('returns not-found when reviewing unknown verification', async () => {
    const repo = makeRepo();
    const result = await repo.reviewVerification({
      verificationId: 'no-such-id',
      reviewedByUserId: 'op-1',
      reviewedByRole: 'operator',
      decision: 'approved',
      reviewedAt: '2026-01-01T12:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-found');
  });

  it('returns already-decided when reviewing an already-approved verification', async () => {
    const repo = makeRepo();
    const created = await repo.submitVerification(baseSubmit);

    await repo.reviewVerification({
      verificationId: created.verificationId,
      reviewedByUserId: 'op-1',
      reviewedByRole: 'operator',
      decision: 'approved',
      reviewedAt: '2026-01-01T12:00:00.000Z',
    });

    const result = await repo.reviewVerification({
      verificationId: created.verificationId,
      reviewedByUserId: 'op-2',
      reviewedByRole: 'operator',
      decision: 'rejected',
      reviewedAt: '2026-01-01T13:00:00.000Z',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('already-decided');
    expect(result.currentStatus).toBe('approved');
  });
});
