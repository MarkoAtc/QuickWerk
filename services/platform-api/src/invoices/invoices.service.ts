import { Inject, Injectable } from '@nestjs/common';

import type { InvoiceRecord, PaymentRecord } from '@quickwerk/domain';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { INVOICE_REPOSITORY, InvoiceRepository } from './domain/invoice.repository';

export type BookingContext = {
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  requestedService: string;
};

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
  ) {}

  async generateInvoiceForBooking(
    booking: BookingContext,
    payment: PaymentRecord,
    correlationId: string,
  ): Promise<InvoiceRecord> {
    const lineItem = {
      description: `Job: ${booking.requestedService}`,
      quantity: 1,
      unitAmountCents: payment.amountCents,
      totalAmountCents: payment.amountCents,
    };

    const subtotalCents = payment.amountCents;
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;
    const createdAt = new Date().toISOString();

    const invoice = await this.invoices.createInvoice({
      bookingId: booking.bookingId,
      customerUserId: booking.customerUserId,
      providerUserId: booking.providerUserId,
      lineItems: [lineItem],
      subtotalCents,
      taxCents,
      totalCents,
      currency: payment.currency,
      createdAt,
    });

    logStructuredBreadcrumb({
      event: 'invoice.generate.write',
      correlationId,
      status: 'succeeded',
      details: {
        invoiceId: invoice.invoiceId,
        bookingId: booking.bookingId,
        totalCents: invoice.totalCents,
        replayed: invoice.createdAt !== createdAt,
      },
    });

    return invoice;
  }

  async getInvoiceByBookingId(
    session: AuthSession,
    bookingId: string,
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; invoice: InvoiceRecord }
  > {
    const invoice = await this.invoices.findInvoiceByBookingId(bookingId);

    if (!invoice) {
      return { ok: false, statusCode: 404, error: 'Invoice not found for this booking.' };
    }

    const isCustomer = session.role === 'customer' && invoice.customerUserId === session.userId;
    const isProvider = session.role === 'provider' && invoice.providerUserId === session.userId;

    if (!isCustomer && !isProvider) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this invoice.' };
    }

    return { ok: true, invoice };
  }
}
