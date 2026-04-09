import { describe, expect, it } from 'vitest';

import { InMemoryBookingRepository } from '../bookings/infrastructure/in-memory-booking.repository';
import { InMemoryDisputeRepository } from './infrastructure/in-memory-dispute.repository';
import { DisputesService } from './disputes.service';

const createService = () => {
  const bookings = new InMemoryBookingRepository();
  const disputes = new InMemoryDisputeRepository();
  return { bookings, service: new DisputesService(disputes, bookings) };
};

const createCompletedBooking = async (
  bookings: InMemoryBookingRepository,
  customerUserId: string,
  providerUserId: string,
) => {
  const created = await bookings.createSubmittedBooking({
    createdAt: new Date().toISOString(),
    customerUserId,
    requestedService: 'Plumbing',
    actorRole: 'customer',
    actorUserId: customerUserId,
  });

  await bookings.acceptSubmittedBooking({
    bookingId: created.bookingId,
    acceptedAt: new Date().toISOString(),
    providerUserId,
    actorRole: 'provider',
    actorUserId: providerUserId,
  });

  await bookings.completeAcceptedBooking({
    bookingId: created.bookingId,
    completedAt: new Date().toISOString(),
    providerUserId,
    actorRole: 'provider',
    actorUserId: providerUserId,
  });

  return created;
};

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
      const { service, bookings } = createService();
      const session = makeCustomerSession();
      const booking = await createCompletedBooking(bookings, session.userId, 'provider-1');

      const result = await service.submitDispute(
        session,
        booking.bookingId,
        'quality',
        'Work was incomplete.',
        'corr-1',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dispute.disputeId).toBeDefined();
        expect(result.dispute.status).toBe('open');
        expect(result.dispute.reporterRole).toBe('customer');
        expect(result.dispute.bookingId).toBe(booking.bookingId);
        expect(result.dispute.category).toBe('quality');
        expect(result.dispute.resolvedAt).toBeNull();
        expect(result.dispute.resolutionNote).toBeNull();
      }
    });

    it('provider submits dispute: reporterRole is provider', async () => {
      const { service, bookings } = createService();
      const session = makeProviderSession();
      const booking = await createCompletedBooking(bookings, 'customer-1', session.userId);

      const result = await service.submitDispute(
        session,
        booking.bookingId,
        'billing',
        'Payment was incorrect.',
        'corr-2',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dispute.reporterRole).toBe('provider');
        expect(result.dispute.status).toBe('open');
      }
    });

    it('is idempotent: same (bookingId, reporterUserId) twice returns same disputeId', async () => {
      const { service, bookings } = createService();
      const session = makeCustomerSession();
      const booking = await createCompletedBooking(bookings, session.userId, 'provider-1');

      const first = await service.submitDispute(
        session,
        booking.bookingId,
        'no-show',
        'Provider did not arrive.',
        'corr-3a',
      );
      const second = await service.submitDispute(
        session,
        booking.bookingId,
        'no-show',
        'Provider did not arrive.',
        'corr-3b',
      );

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.dispute.disputeId).toBe(first.dispute.disputeId);
      }
    });
  });

  describe('getPendingDisputes', () => {
    it('returns open and under-review disputes for operator session', async () => {
      const { service, bookings } = createService();
      const customer = makeCustomerSession();
      const operator = makeOperatorSession();
      const booking = await createCompletedBooking(bookings, customer.userId, 'provider-1');

      const submitted = await service.submitDispute(customer, booking.bookingId, 'safety', 'Safety concern.', 'corr-4');
      if (!submitted.ok) {
        throw new Error('Expected dispute submit to succeed in setup.');
      }

      await service.startReviewDispute(operator, submitted.dispute.disputeId, 'corr-4a');

      const result = await service.getPendingDisputes(operator);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.disputes)).toBe(true);
        expect(result.disputes.length).toBeGreaterThan(0);
        expect(result.disputes.every((d) => d.status === 'open' || d.status === 'under-review')).toBe(true);
      }
    });

    it('returns 403 for non-operator session', async () => {
      const { service } = createService();
      const customer = makeCustomerSession();

      const result = await service.getPendingDisputes(customer);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(403);
      }
    });

    it('returns empty array when no open disputes exist', async () => {
      const { service } = createService();
      const operator = makeOperatorSession();

      const result = await service.getPendingDisputes(operator);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.disputes).toHaveLength(0);
      }
    });
  });

  describe('operator transitions', () => {
    it('supports open -> under-review -> resolved and removes from pending list', async () => {
      const { service, bookings } = createService();
      const customer = makeCustomerSession();
      const operator = makeOperatorSession();
      const booking = await createCompletedBooking(bookings, customer.userId, 'provider-1');

      const submitted = await service.submitDispute(customer, booking.bookingId, 'quality', 'Need review', 'corr-5');
      expect(submitted.ok).toBe(true);
      if (!submitted.ok) return;

      const review = await service.startReviewDispute(operator, submitted.dispute.disputeId, 'corr-5a');
      expect(review.ok).toBe(true);
      if (!review.ok) return;
      expect(review.dispute.status).toBe('under-review');

      const resolved = await service.resolveDispute(
        operator,
        submitted.dispute.disputeId,
        'Refund approved for customer.',
        'corr-5b',
      );
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      expect(resolved.dispute.status).toBe('resolved');
      expect(resolved.dispute.resolvedAt).not.toBeNull();
      expect(resolved.dispute.resolutionNote).toContain('Refund');

      const pending = await service.getPendingDisputes(operator);
      expect(pending.ok).toBe(true);
      if (!pending.ok) return;
      expect(pending.disputes.some((d) => d.disputeId === submitted.dispute.disputeId)).toBe(false);
    });

    it('enforces operator role and transition guards', async () => {
      const { service, bookings } = createService();
      const customer = makeCustomerSession();
      const booking = await createCompletedBooking(bookings, customer.userId, 'provider-1');

      const submitted = await service.submitDispute(customer, booking.bookingId, 'billing', 'Charge mismatch', 'corr-6');
      expect(submitted.ok).toBe(true);
      if (!submitted.ok) return;

      const forbidden = await service.startReviewDispute(customer, submitted.dispute.disputeId, 'corr-6a');
      expect(forbidden.ok).toBe(false);
      if (!forbidden.ok) {
        expect(forbidden.statusCode).toBe(403);
      }

      const operator = makeOperatorSession();
      const invalidResolve = await service.resolveDispute(
        operator,
        submitted.dispute.disputeId,
        'Cannot resolve directly from open.',
        'corr-6b',
      );
      expect(invalidResolve.ok).toBe(false);
      if (!invalidResolve.ok) {
        expect(invalidResolve.statusCode).toBe(409);
      }
    });

    it('is idempotent for repeated operator actions on already transitioned records', async () => {
      const { service, bookings } = createService();
      const customer = makeCustomerSession();
      const operator = makeOperatorSession();
      const booking = await createCompletedBooking(bookings, customer.userId, 'provider-1');

      const submitted = await service.submitDispute(customer, booking.bookingId, 'other', 'Duplicate retry', 'corr-7');
      expect(submitted.ok).toBe(true);
      if (!submitted.ok) return;

      const first = await service.startReviewDispute(operator, submitted.dispute.disputeId, 'corr-7a');
      const second = await service.startReviewDispute(operator, submitted.dispute.disputeId, 'corr-7b');

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.dispute.status).toBe('under-review');
      expect(second.dispute.status).toBe('under-review');
    });
  });
});
