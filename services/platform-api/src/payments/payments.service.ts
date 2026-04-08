import { Inject, Injectable } from '@nestjs/common';

import type { PaymentRecord } from '@quickwerk/domain';

import { InvoicesService } from '../invoices/invoices.service';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { PayoutsService } from '../payouts/payouts.service';
import { CreatePaymentInput, PAYMENT_REPOSITORY, PaymentRepository } from './domain/payment.repository';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    private readonly payoutsService: PayoutsService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async capturePaymentForBooking(
    input: CreatePaymentInput,
  ): Promise<{ ok: true; payment: PaymentRecord; replayed: boolean }> {
    const requestedService = input.requestedService.trim();
    if (!requestedService) {
      logStructuredBreadcrumb({
        event: 'payment.capture.write',
        correlationId: input.correlationId,
        status: 'failed',
        details: {
          bookingId: input.bookingId,
          amountCents: input.amountCents,
          currency: input.currency,
          reason: 'missing-requested-service',
        },
      });
      throw new Error(`Failed to capture payment for booking ${input.bookingId}: missing requestedService`);
    }

    const result = await this.payments.createPayment(input);

    if (!result.ok) {
      logStructuredBreadcrumb({
        event: 'payment.capture.write',
        correlationId: input.correlationId,
        status: 'failed',
        details: {
          bookingId: input.bookingId,
          amountCents: input.amountCents,
          currency: input.currency,
          reason: result.reason,
        },
      });

      throw new Error(`Failed to capture payment for booking ${input.bookingId}: ${result.reason}`);
    }

    logStructuredBreadcrumb({
      event: 'payment.capture.write',
      correlationId: input.correlationId,
      status: 'succeeded',
      details: {
        paymentId: result.payment.paymentId,
        bookingId: input.bookingId,
        amountCents: input.amountCents,
        currency: input.currency,
        replayed: result.replayed,
      },
    });

    await this.payoutsService.createPayoutForCapture(
      result.payment,
      input.providerUserId,
      input.correlationId,
    );

    try {
      await this.invoicesService.generateInvoiceForBooking(
        {
          bookingId: input.bookingId,
          customerUserId: input.customerUserId,
          providerUserId: input.providerUserId,
          requestedService,
        },
        result.payment,
        input.correlationId,
      );
    } catch (error) {
      logStructuredBreadcrumb({
        event: 'payment.capture.post-processing',
        correlationId: input.correlationId,
        status: 'failed',
        details: {
          paymentId: result.payment.paymentId,
          bookingId: input.bookingId,
          reason: 'invoice-generation-failed-after-payout',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }

    return result;
  }

  async getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null> {
    return this.payments.getPaymentByBookingId(bookingId);
  }
}
