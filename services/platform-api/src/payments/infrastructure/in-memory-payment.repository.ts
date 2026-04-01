import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { PaymentRecord } from '@quickwerk/domain';

import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRepository,
} from '../domain/payment.repository';

@Injectable()
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, PaymentRecord>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const existing = Array.from(this.payments.values()).find(
      (p) => p.bookingId === input.bookingId,
    );

    if (existing) {
      return { ok: true, payment: existing, replayed: true };
    }

    const paymentId = randomUUID();
    const record: PaymentRecord = {
      paymentId,
      bookingId: input.bookingId,
      customerUserId: input.customerUserId,
      providerUserId: input.providerUserId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: 'captured',
      capturedAt: input.capturedAt,
      correlationId: input.correlationId,
    };

    this.payments.set(paymentId, record);

    return { ok: true, payment: record, replayed: false };
  }

  async getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null> {
    const found = Array.from(this.payments.values()).find((p) => p.bookingId === bookingId);
    return found ?? null;
  }
}
