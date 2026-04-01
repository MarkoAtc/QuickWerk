import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { PayoutRecord } from '@quickwerk/domain';

import { CreatePayoutInput, PayoutRepository } from '../domain/payout.repository';

@Injectable()
export class InMemoryPayoutRepository implements PayoutRepository {
  private readonly payouts = new Map<string, PayoutRecord>();

  async createPayout(input: CreatePayoutInput): Promise<PayoutRecord> {
    const payoutId = randomUUID();
    const record: PayoutRecord = {
      payoutId,
      providerUserId: input.providerUserId,
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: 'pending',
      settlementRef: null,
      createdAt: input.createdAt,
      settledAt: null,
    };

    this.payouts.set(payoutId, record);
    return record;
  }

  async findPayoutById(payoutId: string): Promise<PayoutRecord | null> {
    return this.payouts.get(payoutId) ?? null;
  }

  async findPayoutsByProviderUserId(providerUserId: string): Promise<PayoutRecord[]> {
    return Array.from(this.payouts.values()).filter((p) => p.providerUserId === providerUserId);
  }

  async findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null> {
    const found = Array.from(this.payouts.values()).find((p) => p.bookingId === bookingId);
    return found ?? null;
  }
}
