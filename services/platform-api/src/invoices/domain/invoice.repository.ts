import type { InvoiceLineItem, InvoiceRecord } from '@quickwerk/domain';

export type CreateInvoiceInput = {
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
};

export interface InvoiceRepository {
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord>;
  findInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null>;
  findInvoiceById(invoiceId: string): Promise<InvoiceRecord | null>;
}

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
