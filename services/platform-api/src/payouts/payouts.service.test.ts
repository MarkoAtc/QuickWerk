import { describe, expect, it } from 'vitest';

import type { PaymentRecord } from '@quickwerk/domain';

import { InMemoryPayoutRepository } from './infrastructure/in-memory-payout.repository';
import { PayoutsService } from './payouts.service';

const createService = () => new PayoutsService(new InMemoryPayoutRepository());

const makePayment = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  paymentId: 'payment-1',
  bookingId: 'booking-1',
  customerUserId: 'customer-1',
  providerUserId: 'provider-1',
  amountCents: 5000,
  currency: 'EUR',
  status: 'captured',
  capturedAt: '2026-04-01T12:00:00.000Z',
  correlationId: 'corr-test',
  ...overrides,
});

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

describe('PayoutsService', () => {
  describe('createPayoutForCapture', () => {
    it('creates a payout record from a captured payment', async () => {
      const service = createService();
      const payment = makePayment();

      const payout = await service.createPayoutForCapture(payment, 'provider-1', 'corr-test');

      expect(payout.payoutId).toBeDefined();
      expect(payout.bookingId).toBe('booking-1');
      expect(payout.paymentId).toBe('payment-1');
      expect(payout.providerUserId).toBe('provider-1');
      expect(payout.amountCents).toBe(5000);
      expect(payout.currency).toBe('EUR');
      expect(payout.status).toBe('pending');
      expect(payout.settlementRef).toBeNull();
      expect(payout.settledAt).toBeNull();
    });

    it('returns existing payout for same bookingId (idempotent)', async () => {
      const service = createService();
      const payment = makePayment();

      const first = await service.createPayoutForCapture(payment, 'provider-1', 'corr-test');
      const second = await service.createPayoutForCapture(payment, 'provider-1', 'corr-test');

      expect(second.payoutId).toBe(first.payoutId);
    });

    it('emits PayoutCreatedDomainEvent breadcrumb on new payout', async () => {
      const service = createService();
      const payment = makePayment({ bookingId: 'booking-new' });

      const payout = await service.createPayoutForCapture(payment, 'provider-1', 'corr-event');

      expect(payout.payoutId).toBeDefined();
      expect(payout.bookingId).toBe('booking-new');
    });
  });

  describe('getMyPayouts', () => {
    it('returns only payouts belonging to the requesting provider', async () => {
      const service = createService();

      await service.createPayoutForCapture(makePayment({ bookingId: 'b-1', paymentId: 'p-1' }), 'provider-1', 'c1');
      await service.createPayoutForCapture(makePayment({ bookingId: 'b-2', paymentId: 'p-2', providerUserId: 'provider-2' }), 'provider-2', 'c2');

      const page = await service.getMyPayouts(makeProviderSession('provider-1'));

      expect(page.payouts).toHaveLength(1);
      expect(page.payouts[0].providerUserId).toBe('provider-1');
      expect(page.nextCursor).toBeNull();
      expect(page.limit).toBe(20);
    });

    it('returns empty array when provider has no payouts', async () => {
      const service = createService();
      const page = await service.getMyPayouts(makeProviderSession('provider-no-payouts'));
      expect(page.payouts).toHaveLength(0);
      expect(page.nextCursor).toBeNull();
      expect(page.limit).toBe(20);
    });

    it('supports bounded cursor pagination', async () => {
      const service = createService();
      await service.createPayoutForCapture(
        makePayment({
          bookingId: 'b-1',
          paymentId: 'p-1',
        }),
        'provider-1',
        'c1',
      );
      await service.createPayoutForCapture(
        makePayment({
          bookingId: 'b-2',
          paymentId: 'p-2',
        }),
        'provider-1',
        'c2',
      );

      const firstPage = await service.getMyPayouts(makeProviderSession('provider-1'), { limit: 1 });
      expect(firstPage.payouts).toHaveLength(1);
      expect(firstPage.nextCursor).toBeTruthy();
      expect(firstPage.limit).toBe(1);

      const secondPage = await service.getMyPayouts(makeProviderSession('provider-1'), {
        limit: 1,
        cursor: firstPage.nextCursor ?? undefined,
      });

      expect(secondPage.payouts).toHaveLength(1);
      expect(secondPage.payouts[0]?.payoutId).not.toBe(firstPage.payouts[0]?.payoutId);
      expect(secondPage.nextCursor).toBeNull();
    });
  });

  describe('getPayoutById', () => {
    it('returns the payout when it belongs to the requesting provider', async () => {
      const service = createService();
      const created = await service.createPayoutForCapture(makePayment(), 'provider-1', 'corr-test');

      const result = await service.getPayoutById(makeProviderSession('provider-1'), created.payoutId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payout.payoutId).toBe(created.payoutId);
      }
    });

    it('returns 404 when payout does not exist', async () => {
      const service = createService();
      const result = await service.getPayoutById(makeProviderSession('provider-1'), 'nonexistent-payout');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(404);
      }
    });

    it('returns 403 when payout belongs to a different provider', async () => {
      const service = createService();
      const created = await service.createPayoutForCapture(makePayment(), 'provider-1', 'corr-test');

      const result = await service.getPayoutById(makeProviderSession('provider-2'), created.payoutId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(403);
      }
    });
  });
});
