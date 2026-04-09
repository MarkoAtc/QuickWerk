import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { PayoutRecord } from '@quickwerk/domain';

import {
  CreatePayoutInput,
  ListPayoutsPageInput,
  ListPayoutsPageResult,
  PayoutRepository,
} from '../domain/payout.repository';

const defaultPayoutPageLimit = 20;
const maxPayoutPageLimit = 100;

@Injectable()
export class InMemoryPayoutRepository implements PayoutRepository {
  private readonly payouts = new Map<string, PayoutRecord>();

  async createPayout(input: CreatePayoutInput): Promise<PayoutRecord> {
    const existing = Array.from(this.payouts.values()).find((p) => p.bookingId === input.bookingId);
    if (existing) {
      return existing;
    }

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

  async findPayoutsByProviderUserId(
    providerUserId: string,
    input?: ListPayoutsPageInput,
  ): Promise<ListPayoutsPageResult> {
    const limit = clampPayoutPageLimit(input?.limit, defaultPayoutPageLimit, maxPayoutPageLimit);
    const sorted = Array.from(this.payouts.values())
      .filter((p) => p.providerUserId === providerUserId)
      .sort((left, right) => comparePayoutOrder(left, right));

    const offset = resolveOffsetFromCursor(sorted, input?.cursor ?? null);
    const paged = sorted.slice(offset, offset + limit + 1);
    const hasMore = paged.length > limit;
    const payouts = hasMore ? paged.slice(0, limit) : paged;
    const nextCursor = hasMore ? payouts[payouts.length - 1]?.payoutId ?? null : null;

    return {
      payouts,
      nextCursor,
      limit,
    };
  }

  async findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null> {
    const found = Array.from(this.payouts.values()).find((p) => p.bookingId === bookingId);
    return found ?? null;
  }
}

function comparePayoutOrder(left: PayoutRecord, right: PayoutRecord): number {
  const createdAtDiff = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return right.payoutId.localeCompare(left.payoutId);
}

function resolveOffsetFromCursor(payouts: PayoutRecord[], cursor: string | null): number {
  if (!cursor) {
    return 0;
  }

  const cursorIndex = payouts.findIndex((payout) => payout.payoutId === cursor);
  if (cursorIndex < 0) {
    return payouts.length;
  }

  return cursorIndex + 1;
}

function clampPayoutPageLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const bounded = Math.floor(value as number);
  if (bounded <= 0) {
    return fallback;
  }

  return Math.min(bounded, max);
}
