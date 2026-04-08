import type { PayoutRecord, PayoutStatus } from '@quickwerk/domain';

import { CreatePayoutInput, PayoutRepository } from '../domain/payout.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';

type PayoutRow = {
  id: string;
  provider_user_id: string;
  booking_id: string;
  payment_id: string;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  settlement_ref: string | null;
  created_at: Date | string;
  settled_at: Date | string | null;
};

const PAYOUT_SELECT_COLUMNS = `
  id::text,
  provider_user_id::text,
  booking_id::text,
  payment_id::text,
  amount_cents,
  currency,
  status,
  settlement_ref,
  created_at,
  settled_at
`;

export class PostgresPayoutRepository implements PayoutRepository {
  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly postgresConfig: PostgresPersistenceConfig,
  ) {}

  async createPayout(input: CreatePayoutInput): Promise<PayoutRecord> {
    await this.postgresClient.query<object>(
      this.postgresConfig,
      `INSERT INTO payouts (
        provider_user_id,
        booking_id,
        payment_id,
        amount_cents,
        currency,
        status,
        created_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', $6::timestamptz)
      ON CONFLICT (booking_id) DO NOTHING`,
      [
        input.providerUserId,
        input.bookingId,
        input.paymentId,
        input.amountCents,
        input.currency,
        input.createdAt,
      ],
    );

    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT ${PAYOUT_SELECT_COLUMNS} FROM payouts WHERE booking_id = $1::uuid LIMIT 1`,
      [input.bookingId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error(`Payout for booking ${input.bookingId} was not found after write.`);
    }

    return mapPayoutRow(row);
  }

  async findPayoutById(payoutId: string): Promise<PayoutRecord | null> {
    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT id::text,
              provider_user_id::text,
              booking_id::text,
              payment_id::text,
              amount_cents,
              currency,
              status,
              settlement_ref,
              created_at,
              settled_at
       FROM payouts
       WHERE id = $1::uuid
       LIMIT 1`,
      [payoutId],
    );

    const row = result.rows[0];

    return row ? mapPayoutRow(row) : null;
  }

  async findPayoutsByProviderUserId(providerUserId: string): Promise<PayoutRecord[]> {
    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT id::text,
              provider_user_id::text,
              booking_id::text,
              payment_id::text,
              amount_cents,
              currency,
              status,
              settlement_ref,
              created_at,
              settled_at
       FROM payouts
       WHERE provider_user_id = $1::uuid
       ORDER BY created_at DESC`,
      [providerUserId],
    );

    return result.rows.map(mapPayoutRow);
  }

  async findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null> {
    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT id::text,
              provider_user_id::text,
              booking_id::text,
              payment_id::text,
              amount_cents,
              currency,
              status,
              settlement_ref,
              created_at,
              settled_at
       FROM payouts
       WHERE booking_id = $1::uuid
       LIMIT 1`,
      [bookingId],
    );

    const row = result.rows[0];

    return row ? mapPayoutRow(row) : null;
  }
}

function mapPayoutRow(row: PayoutRow): PayoutRecord {
  return {
    payoutId: row.id,
    providerUserId: row.provider_user_id,
    bookingId: row.booking_id,
    paymentId: row.payment_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    settlementRef: row.settlement_ref,
    createdAt: toIsoString(row.created_at),
    settledAt: row.settled_at ? toIsoString(row.settled_at) : null,
  };
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}
