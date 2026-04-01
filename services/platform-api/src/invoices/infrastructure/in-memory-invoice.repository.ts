import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { InvoiceRecord } from '@quickwerk/domain';

import { CreateInvoiceInput, InvoiceRepository } from '../domain/invoice.repository';

@Injectable()
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices = new Map<string, InvoiceRecord>();

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const invoiceId = randomUUID();
    const issuedAt = new Date().toISOString();

    const record: InvoiceRecord = {
      invoiceId,
      bookingId: input.bookingId,
      customerUserId: input.customerUserId,
      providerUserId: input.providerUserId,
      lineItems: input.lineItems,
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      currency: input.currency,
      status: 'issued',
      issuedAt,
      createdAt: input.createdAt,
      pdfUrl: null,
    };

    this.invoices.set(invoiceId, record);
    return record;
  }

  async findInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null> {
    const found = Array.from(this.invoices.values()).find((i) => i.bookingId === bookingId);
    return found ?? null;
  }

  async findInvoiceById(invoiceId: string): Promise<InvoiceRecord | null> {
    return this.invoices.get(invoiceId) ?? null;
  }
}
