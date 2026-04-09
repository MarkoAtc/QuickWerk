import { randomUUID } from 'node:crypto';

import type { InvoiceLineItem, InvoiceRecord, InvoiceStatus } from '@quickwerk/domain';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';
import { CreateInvoiceInput, InvoiceRepository } from '../domain/invoice.repository';

type InvoiceRow = {
  id: string;
  booking_id: string;
  customer_user_id: string;
  provider_user_id: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: Date | string | null;
  created_at: Date | string;
  pdf_url: string | null;
};

type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
};

export class PostgresInvoiceRepository implements InvoiceRepository {
  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly postgresConfig: PostgresPersistenceConfig,
  ) {}

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
    const invoiceId = randomUUID();
    const issuedAt = new Date().toISOString();

    await this.postgresClient.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO invoices (
          id,
          booking_id,
          customer_user_id,
          provider_user_id,
          subtotal_cents,
          tax_cents,
          total_cents,
          currency,
          status,
          issued_at,
          created_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::uuid,
          $5, $6, $7, $8, 'issued',
          $9::timestamptz, $10::timestamptz
        ) ON CONFLICT (booking_id) DO NOTHING`,
        [
          invoiceId,
          input.bookingId,
          input.customerUserId,
          input.providerUserId,
          input.subtotalCents,
          input.taxCents,
          input.totalCents,
          input.currency,
          issuedAt,
          input.createdAt,
        ],
      );

      const existingResult = await client.query<Pick<InvoiceRow, 'id'>>(
        `SELECT id::text FROM invoices WHERE booking_id = $1::uuid`,
        [input.bookingId],
      );

      const existingId = existingResult.rows[0]?.id;

      if (!existingId) {
        throw new Error(`Invoice for booking ${input.bookingId} not found after insert.`);
      }

      if (existingId === invoiceId) {
        for (const item of input.lineItems) {
          await client.query(
            `INSERT INTO invoice_line_items (
              id,
              invoice_id,
              description,
              quantity,
              unit_amount_cents,
              total_amount_cents
            ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
            [
              randomUUID(),
              invoiceId,
              item.description,
              item.quantity,
              item.unitAmountCents,
              item.totalAmountCents,
            ],
          );
        }
      }

      return null;
    }, {
      ...process.env,
      DATABASE_URL: this.postgresConfig.databaseUrl,
      PERSISTENCE_MODE: 'postgres',
    });

    const record = await this.findInvoiceByBookingId(input.bookingId);

    if (!record) {
      throw new Error(`Invoice for booking ${input.bookingId} was not found after write.`);
    }

    return record;
  }

  async findInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null> {
    const result = await this.postgresClient.query<InvoiceRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              customer_user_id::text,
              provider_user_id::text,
              subtotal_cents,
              tax_cents,
              total_cents,
              currency,
              status,
              issued_at,
              created_at,
              pdf_url
       FROM invoices
       WHERE booking_id = $1::uuid
       LIMIT 1`,
      [bookingId],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.loadWithLineItems(row);
  }

  async findInvoiceById(invoiceId: string): Promise<InvoiceRecord | null> {
    const result = await this.postgresClient.query<InvoiceRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              customer_user_id::text,
              provider_user_id::text,
              subtotal_cents,
              tax_cents,
              total_cents,
              currency,
              status,
              issued_at,
              created_at,
              pdf_url
       FROM invoices
       WHERE id = $1::uuid
       LIMIT 1`,
      [invoiceId],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.loadWithLineItems(row);
  }

  private async loadWithLineItems(row: InvoiceRow): Promise<InvoiceRecord> {
    const lineItemsResult = await this.postgresClient.query<InvoiceLineItemRow>(
      this.postgresConfig,
      `SELECT id::text,
              invoice_id::text,
              description,
              quantity,
              unit_amount_cents,
              total_amount_cents
       FROM invoice_line_items
       WHERE invoice_id = $1::uuid`,
      [row.id],
    );

    return mapInvoiceRecord(row, lineItemsResult.rows);
  }
}

function mapInvoiceRecord(row: InvoiceRow, lineItemRows: InvoiceLineItemRow[]): InvoiceRecord {
  const lineItems: InvoiceLineItem[] = lineItemRows.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitAmountCents: item.unit_amount_cents,
    totalAmountCents: item.total_amount_cents,
  }));

  return {
    invoiceId: row.id,
    bookingId: row.booking_id,
    customerUserId: row.customer_user_id,
    providerUserId: row.provider_user_id,
    lineItems,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    currency: row.currency,
    status: row.status,
    issuedAt: row.issued_at ? toIsoString(row.issued_at) : null,
    createdAt: toIsoString(row.created_at),
    pdfUrl: row.pdf_url,
  };
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}
