import { describe, expect, it } from 'vitest';

import { InMemoryDisputeRepository } from './infrastructure/in-memory-dispute.repository';
import { DisputesService } from './disputes.service';

const createService = () => new DisputesService(new InMemoryDisputeRepository());

const makeCustomerSession = (userId = 'customer-1') => {
  const createdAt = new Date();
  return {
    userId,
    role: 'customer' as const,
    token: `tok-${userId}`,
    email: `${userId}@quickwerk.local`,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 3600000).toISOString(),
  };
};

const makeProviderSession = (userId = 'provider-1') => {
  const createdAt = new Date();
  return {
    userId,
    role: 'provider' as const,
    token: `tok-${userId}`,
    email: `${userId}@quickwerk.local`,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 3600000).toISOString(),
  };
};

const makeOperatorSession = (userId = 'operator-1') => {
  const createdAt = new Date();
  return {
    userId,
    role: 'operator' as const,
    token: `tok-${userId}`,
    email: `${userId}@quickwerk.local`,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 3600000).toISOString(),
  };
};

describe('DisputesService', () => {
  describe('submitDispute', () => {
    it('customer submits dispute: disputeId present, status open, reporterRole customer', async () => {
      const service = createService();
      const session = makeCustomerSession();

      const result = await service.submitDispute(session, 'booking-1', 'quality', 'Work was incomplete.', 'corr-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dispute.disputeId).toBeDefined();
        expect(result.dispute.status).toBe('open');
        expect(result.dispute.reporterRole).toBe('customer');
        expect(result.dispute.bookingId).toBe('booking-1');
        expect(result.dispute.category).toBe('quality');
        expect(result.dispute.resolvedAt).toBeNull();
        expect(result.dispute.resolutionNote).toBeNull();
      }
    });

    it('provider submits dispute: reporterRole is provider', async () => {
      const service = createService();
      const session = makeProviderSession();

      const result = await service.submitDispute(session, 'booking-2', 'billing', 'Payment was incorrect.', 'corr-2');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dispute.reporterRole).toBe('provider');
        expect(result.dispute.status).toBe('open');
      }
    });

    it('is idempotent: same (bookingId, reporterUserId) twice returns same disputeId', async () => {
      const service = createService();
      const session = makeCustomerSession();

      const first = await service.submitDispute(session, 'booking-3', 'no-show', 'Provider did not arrive.', 'corr-3a');
      const second = await service.submitDispute(session, 'booking-3', 'no-show', 'Provider did not arrive.', 'corr-3b');

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.dispute.disputeId).toBe(first.dispute.disputeId);
      }
    });
  });

  describe('getPendingDisputes', () => {
    it('returns open disputes for operator session', async () => {
      const service = createService();
      const customer = makeCustomerSession();
      const operator = makeOperatorSession();

      await service.submitDispute(customer, 'booking-4', 'safety', 'Safety concern.', 'corr-4');

      const result = await service.getPendingDisputes(operator);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.disputes)).toBe(true);
        expect(result.disputes.length).toBeGreaterThan(0);
        expect(result.disputes.every((d) => d.status === 'open')).toBe(true);
      }
    });

    it('returns 403 for non-operator session', async () => {
      const service = createService();
      const customer = makeCustomerSession();

      const result = await service.getPendingDisputes(customer);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(403);
      }
    });

    it('returns empty array when no open disputes exist', async () => {
      const service = createService();
      const operator = makeOperatorSession();

      const result = await service.getPendingDisputes(operator);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.disputes).toHaveLength(0);
      }
    });
  });
});
