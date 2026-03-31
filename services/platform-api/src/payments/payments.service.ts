import { Inject, Injectable } from '@nestjs/common';

import type { PaymentRecord } from '@quickwerk/domain';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { CreatePaymentInput, PAYMENT_REPOSITORY, PaymentRepository } from './domain/payment.repository';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
  ) {}

  async capturePaymentForBooking(
    input: CreatePaymentInput,
  ): Promise<{ ok: true; payment: PaymentRecord; replayed: boolean }> {
    const result = await this.payments.createPayment(input);

    logStructuredBreadcrumb({
      event: 'payment.capture.write',
      correlationId: input.correlationId,
      status: 'succeeded',
      details: {
        paymentId: result.ok ? result.payment.paymentId : 'unknown',
        bookingId: input.bookingId,
        amountCents: input.amountCents,
        currency: input.currency,
        replayed: result.ok ? result.replayed : false,
      },
    });

    if (!result.ok) {
      throw new Error(`Failed to capture payment for booking ${input.bookingId}: ${result.reason}`);
    }

    return result;
  }

  async getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null> {
    return this.payments.getPaymentByBookingId(bookingId);
  }
}
