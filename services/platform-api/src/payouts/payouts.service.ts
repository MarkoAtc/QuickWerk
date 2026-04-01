import { Inject, Injectable } from '@nestjs/common';

import type { PaymentRecord, PayoutCreatedDomainEvent, PayoutRecord } from '@quickwerk/domain';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { PAYOUT_REPOSITORY, PayoutRepository } from './domain/payout.repository';

@Injectable()
export class PayoutsService {
  constructor(
    @Inject(PAYOUT_REPOSITORY)
    private readonly payouts: PayoutRepository,
  ) {}

  async createPayoutForCapture(
    payment: PaymentRecord,
    providerUserId: string,
    correlationId: string,
  ): Promise<PayoutRecord> {
    const existing = await this.payouts.findPayoutByBookingId(payment.bookingId);

    if (existing) {
      logStructuredBreadcrumb({
        event: 'payout.create.write',
        correlationId,
        status: 'succeeded',
        details: {
          payoutId: existing.payoutId,
          bookingId: payment.bookingId,
          replayed: true,
        },
      });

      return existing;
    }

    const payout = await this.payouts.createPayout({
      providerUserId,
      bookingId: payment.bookingId,
      paymentId: payment.paymentId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      createdAt: new Date().toISOString(),
    });

    const payoutCreatedEvent: PayoutCreatedDomainEvent = {
      type: 'payout.created',
      payoutId: payout.payoutId,
      bookingId: payout.bookingId,
      providerUserId: payout.providerUserId,
      amountCents: payout.amountCents,
      currency: payout.currency,
      correlationId,
      occurredAt: payout.createdAt,
    };

    logStructuredBreadcrumb({
      event: 'payout.created.domain-event.emit',
      correlationId,
      status: 'succeeded',
      details: {
        payoutId: payoutCreatedEvent.payoutId,
        bookingId: payoutCreatedEvent.bookingId,
        providerUserId: payoutCreatedEvent.providerUserId,
        amountCents: payoutCreatedEvent.amountCents,
        currency: payoutCreatedEvent.currency,
      },
    });

    logStructuredBreadcrumb({
      event: 'payout.create.write',
      correlationId,
      status: 'succeeded',
      details: {
        payoutId: payout.payoutId,
        bookingId: payment.bookingId,
        replayed: false,
      },
    });

    return payout;
  }

  async getMyPayouts(session: AuthSession): Promise<PayoutRecord[]> {
    return this.payouts.findPayoutsByProviderUserId(session.userId);
  }

  async getPayoutById(
    session: AuthSession,
    payoutId: string,
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; payout: PayoutRecord }
  > {
    const payout = await this.payouts.findPayoutById(payoutId);

    if (!payout) {
      return { ok: false, statusCode: 404, error: 'Payout not found.' };
    }

    if (payout.providerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this payout.' };
    }

    return { ok: true, payout };
  }
}
