import type { PayoutRecord, PayoutStatus } from '@quickwerk/domain';

import {
  CreatePayoutInput,
  ListPayoutsPageInput,
  ListPayoutsPageResult,
  PayoutRepository,
} from '../domain/payout.repository';
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

const defaultPayoutPageLimit = 20;
const maxPayoutPageLimit = 100;

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

    if (
      row.provider_user_id !== input.providerUserId ||
      row.payment_id !== input.paymentId ||
      row.amount_cents !== input.amountCents ||
      row.currency !== input.currency
    ) {
      throw new Error(`Conflicting payout already exists for booking ${input.bookingId}.`);
    }

    return mapPayoutRow(row);
  }

  async findPayoutById(payoutId: string): Promise<PayoutRecord | null> {
    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT ${PAYOUT_SELECT_COLUMNS}
       FROM payouts
       WHERE id = $1::uuid
       LIMIT 1`,
      [payoutId],
    );

    const row = result.rows[0];

    return row ? mapPayoutRow(row) : null;
  }

  async findPayoutsByProviderUserId(
    providerUserId: string,
    input?: ListPayoutsPageInput,
  ): Promise<ListPayoutsPageResult> {
    const limit = clampPayoutPageLimit(input?.limit, defaultPayoutPageLimit, maxPayoutPageLimit);
    const cursor = input?.cursor ?? null;

    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT ${PAYOUT_SELECT_COLUMNS}
       FROM payouts
       WHERE provider_user_id = $1::uuid
         AND (
           $2::uuid IS NULL
           OR (
             created_at,
             id
           ) < (
             SELECT created_at, id
             FROM payouts
             WHERE id = $2::uuid
               AND provider_user_id = $1::uuid
           )
         )
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      [providerUserId, cursor, limit + 1],
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const payouts = rows.map(mapPayoutRow);
    const nextCursor = hasMore ? payouts[payouts.length - 1]?.payoutId ?? null : null;

    return {
      payouts,
      nextCursor,
      limit,
    };
  }

  async findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null> {
    const result = await this.postgresClient.query<PayoutRow>(
      this.postgresConfig,
      `SELECT ${PAYOUT_SELECT_COLUMNS}
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

function clampPayoutPageLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const bounded = Math.floor(value as number);
  if (bounded <= 0) {
    return fallback;
  }

  return Math.min(bounded, max);
}
