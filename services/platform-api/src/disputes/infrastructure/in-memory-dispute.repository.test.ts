import { describe, expect, it } from 'vitest';

import { InMemoryDisputeRepository } from './in-memory-dispute.repository';

describe('InMemoryDisputeRepository', () => {
  it('applies transition and supports idempotent replay', async () => {
    const repository = new InMemoryDisputeRepository();

    const disputeId = 'd-1';
    await repository.save({
      disputeId,
      bookingId: 'b-1',
      reporterUserId: 'u-1',
      reporterRole: 'customer',
      category: 'quality',
      description: 'Bad quality',
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionNote: null,
    });

    const transitioned = await repository.transitionStatus({
      disputeId,
      allowedCurrentStatuses: ['open'],
      nextStatus: 'under-review',
    });

    expect(transitioned.ok).toBe(true);
    if (!transitioned.ok) return;
    expect(transitioned.dispute.status).toBe('under-review');
    expect(transitioned.replayed).toBe(false);

    const replay = await repository.transitionStatus({
      disputeId,
      allowedCurrentStatuses: ['open'],
      nextStatus: 'under-review',
    });

    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replayed).toBe(true);
  });

  it('returns transition conflict when current status is not allowed', async () => {
    const repository = new InMemoryDisputeRepository();
    const disputeId = 'd-2';

    await repository.save({
      disputeId,
      bookingId: 'b-2',
      reporterUserId: 'u-2',
      reporterRole: 'provider',
      category: 'billing',
      description: 'Billing issue',
      status: 'resolved',
      createdAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
      resolutionNote: 'Done',
    });

    const result = await repository.transitionStatus({
      disputeId,
      allowedCurrentStatuses: ['under-review'],
      nextStatus: 'closed',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('transition-conflict');
  });
});
