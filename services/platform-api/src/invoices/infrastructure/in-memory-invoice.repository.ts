import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { InvoiceRecord } from '@quickwerk/domain';

import { CreateInvoiceInput, InvoiceRepository } from '../domain/invoice.repository';

@Injectable()
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices = new Map<string, InvoiceRecord>();
  private readonly invoiceIdByBookingId = new Map<string, string>();

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const existingInvoiceId = this.invoiceIdByBookingId.get(input.bookingId);
    const existing = existingInvoiceId ? this.invoices.get(existingInvoiceId) : undefined;
    if (existing) {
      return this.cloneRecord(existing);
    }

    const invoiceId = randomUUID();
    const issuedAt = new Date().toISOString();

    const record: InvoiceRecord = {
      invoiceId,
      bookingId: input.bookingId,
      customerUserId: input.customerUserId,
      providerUserId: input.providerUserId,
      lineItems: input.lineItems.map((item) => ({ ...item })),
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      currency: input.currency,
      status: 'issued',
      issuedAt,
      createdAt: input.createdAt,
      pdfUrl: null,
    };

    this.invoices.set(invoiceId, this.cloneRecord(record));
    this.invoiceIdByBookingId.set(input.bookingId, invoiceId);
    return this.cloneRecord(record);
  }

  async findInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null> {
    const invoiceId = this.invoiceIdByBookingId.get(bookingId);
    const found = invoiceId ? this.invoices.get(invoiceId) : undefined;
    return found ? this.cloneRecord(found) : null;
  }

  async findInvoiceById(invoiceId: string): Promise<InvoiceRecord | null> {
    const found = this.invoices.get(invoiceId);
    return found ? this.cloneRecord(found) : null;
  }

  private cloneRecord(record: InvoiceRecord): InvoiceRecord {
    return {
      ...record,
      lineItems: record.lineItems.map((item) => ({ ...item })),
    };
  }
}
