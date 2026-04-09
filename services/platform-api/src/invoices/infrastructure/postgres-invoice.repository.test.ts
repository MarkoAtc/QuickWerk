import { describe, expect, it } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresInvoiceRepository } from './postgres-invoice.repository';

const postgresConfig = {
  databaseUrl: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
} as const;

type InvoiceState = {
  id: string;
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  status: string;
  issuedAt: string;
  createdAt: string;
  pdfUrl: string | null;
};

type LineItemState = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
};

const sampleLineItems = [
  {
    description: 'Plumbing service',
    quantity: 2,
    unitAmountCents: 5000,
    totalAmountCents: 10000,
  },
];

const sampleInput = {
  bookingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  customerUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  providerUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  lineItems: sampleLineItems,
  subtotalCents: 10000,
  taxCents: 1000,
  totalCents: 11000,
  currency: 'USD',
  createdAt: '2026-03-20T12:00:00.000Z',
};

function buildFakeClient(
  invoices: Map<string, InvoiceState>,
  lineItems: Map<string, LineItemState[]>,
): PostgresClient {
  const txClient = {
    query: async <T>(text: string, values: unknown[]) =>
      queryAgainstState<T>(invoices, lineItems, text, values),
  };

  return {
    query: async <T>(
      _config: { databaseUrl: string },
      text: string,
      values: readonly unknown[],
    ) => queryAgainstState<T>(invoices, lineItems, text, values),
    withTransaction: async <T>(
      fn: (client: typeof txClient, config: { databaseUrl: string }) => Promise<T>,
    ) => fn(txClient, postgresConfig),
  } as unknown as PostgresClient;
}

describe('PostgresInvoiceRepository', () => {
  it('createInvoice persists and returns invoice with correct field mappings and line items', async () => {
    const invoices = new Map<string, InvoiceState>();
    const lineItems = new Map<string, LineItemState[]>();
    const repository = new PostgresInvoiceRepository(buildFakeClient(invoices, lineItems), postgresConfig);

    const record = await repository.createInvoice(sampleInput);

    expect(record.bookingId).toBe(sampleInput.bookingId);
    expect(record.customerUserId).toBe(sampleInput.customerUserId);
    expect(record.providerUserId).toBe(sampleInput.providerUserId);
    expect(record.subtotalCents).toBe(10000);
    expect(record.taxCents).toBe(1000);
    expect(record.totalCents).toBe(11000);
    expect(record.currency).toBe('USD');
    expect(record.status).toBe('issued');
    expect(record.issuedAt).not.toBeNull();
    expect(record.pdfUrl).toBeNull();
    expect(record.lineItems).toHaveLength(1);
    expect(record.lineItems[0]).toMatchObject({
      description: 'Plumbing service',
      quantity: 2,
      unitAmountCents: 5000,
      totalAmountCents: 10000,
    });
  });

  it('createInvoice is idempotent — second call with same bookingId returns existing record', async () => {
    const invoices = new Map<string, InvoiceState>();
    const lineItems = new Map<string, LineItemState[]>();
    const repository = new PostgresInvoiceRepository(buildFakeClient(invoices, lineItems), postgresConfig);

    const first = await repository.createInvoice(sampleInput);
    const second = await repository.createInvoice(sampleInput);

    expect(second.invoiceId).toBe(first.invoiceId);
    expect(second.bookingId).toBe(first.bookingId);
    expect(lineItems.get(first.invoiceId)).toHaveLength(1);
  });

  it('findInvoiceByBookingId returns null when not found', async () => {
    const repository = new PostgresInvoiceRepository(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        withTransaction: async <T>(fn: () => Promise<T>) => fn(),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    const result = await repository.findInvoiceByBookingId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result).toBeNull();
  });

  it('findInvoiceByBookingId returns full record with line items when found', async () => {
    const invoices = new Map<string, InvoiceState>();
    const lineItems = new Map<string, LineItemState[]>();
    const repository = new PostgresInvoiceRepository(buildFakeClient(invoices, lineItems), postgresConfig);

    await repository.createInvoice(sampleInput);
    const found = await repository.findInvoiceByBookingId(sampleInput.bookingId);

    expect(found).not.toBeNull();
    expect(found?.bookingId).toBe(sampleInput.bookingId);
    expect(found?.lineItems).toHaveLength(1);
    expect(found?.lineItems[0]?.description).toBe('Plumbing service');
  });

  it('findInvoiceById returns null when not found', async () => {
    const repository = new PostgresInvoiceRepository(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        withTransaction: async <T>(fn: () => Promise<T>) => fn(),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    const result = await repository.findInvoiceById('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result).toBeNull();
  });

  it('findInvoiceById returns full record with line items when found', async () => {
    const invoices = new Map<string, InvoiceState>();
    const lineItems = new Map<string, LineItemState[]>();
    const repository = new PostgresInvoiceRepository(buildFakeClient(invoices, lineItems), postgresConfig);

    const created = await repository.createInvoice(sampleInput);
    const found = await repository.findInvoiceById(created.invoiceId);

    expect(found).not.toBeNull();
    expect(found?.invoiceId).toBe(created.invoiceId);
    expect(found?.lineItems).toHaveLength(1);
    expect(found?.lineItems[0]?.unitAmountCents).toBe(5000);
  });
});

async function queryAgainstState<T>(
  invoices: Map<string, InvoiceState>,
  lineItems: Map<string, LineItemState[]>,
  text: string,
  values: readonly unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  if (text.includes('INSERT INTO invoices')) {
    const [id, bookingId, customerUserId, providerUserId, subtotalCents, taxCents, totalCents, currency, issuedAt, createdAt] =
      values as [string, string, string, string, number, number, number, string, string, string];

    if (!invoices.has(bookingId)) {
      invoices.set(bookingId, {
        id,
        bookingId,
        customerUserId,
        providerUserId,
        subtotalCents,
        taxCents,
        totalCents,
        currency,
        status: 'issued',
        issuedAt,
        createdAt,
        pdfUrl: null,
      });
    }

    return { rows: [], rowCount: 1 };
  }

  if (text.includes('INSERT INTO invoice_line_items')) {
    const [id, invoiceId, description, quantity, unitAmountCents, totalAmountCents] =
      values as [string, string, string, number, number, number];

    const items = lineItems.get(invoiceId) ?? [];
    items.push({ id, invoiceId, description, quantity, unitAmountCents, totalAmountCents });
    lineItems.set(invoiceId, items);

    return { rows: [], rowCount: 1 };
  }

  if (text.includes('FROM invoices') && text.includes('WHERE booking_id = $1')) {
    const bookingId = values[0] as string;
    const invoice = invoices.get(bookingId);

    if (!invoice) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [mapInvoiceRow(invoice)] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('FROM invoices') && text.includes('WHERE id = $1')) {
    const invoiceId = values[0] as string;
    const invoice = Array.from(invoices.values()).find((inv) => inv.id === invoiceId);

    if (!invoice) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [mapInvoiceRow(invoice)] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('FROM invoice_line_items')) {
    const invoiceId = values[0] as string;
    const items = lineItems.get(invoiceId) ?? [];

    return {
      rows: items.map((item) => ({
        id: item.id,
        invoice_id: item.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: item.unitAmountCents,
        total_amount_cents: item.totalAmountCents,
      })) as T[],
      rowCount: items.length,
    };
  }

  throw new Error(`Unhandled mocked SQL query: ${text}`);
}

function mapInvoiceRow(invoice: InvoiceState) {
  return {
    id: invoice.id,
    booking_id: invoice.bookingId,
    customer_user_id: invoice.customerUserId,
    provider_user_id: invoice.providerUserId,
    subtotal_cents: invoice.subtotalCents,
    tax_cents: invoice.taxCents,
    total_cents: invoice.totalCents,
    currency: invoice.currency,
    status: invoice.status,
    issued_at: invoice.issuedAt,
    created_at: invoice.createdAt,
    pdf_url: invoice.pdfUrl,
  };
}
