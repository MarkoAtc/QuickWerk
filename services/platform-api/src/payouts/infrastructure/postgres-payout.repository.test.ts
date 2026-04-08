import { describe, expect, it } from 'vitest';

import type { PayoutStatus } from '@quickwerk/domain';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPayoutRepository } from './postgres-payout.repository';

type PayoutState = {
  id: string;
  providerUserId: string;
  bookingId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  settlementRef: string | null;
  createdAt: string;
  settledAt: string | null;
};

const postgresConfig = {
  databaseUrl: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
} as const;

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '22222222-2222-4222-8222-222222222222';
const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';
const PAYOUT_ID = '44444444-4444-4444-8444-444444444444';
const CREATED_AT = '2026-03-20T12:00:00.000Z';

function makePayoutState(overrides: Partial<PayoutState> = {}): PayoutState {
  return {
    id: PAYOUT_ID,
    providerUserId: PROVIDER_ID,
    bookingId: BOOKING_ID,
    paymentId: PAYMENT_ID,
    amountCents: 5000,
    currency: 'USD',
    status: 'pending',
    settlementRef: null,
    createdAt: CREATED_AT,
    settledAt: null,
    ...overrides,
  };
}

describe('PostgresPayoutRepository', () => {
  describe('createPayout', () => {
    it('returns payout record with correct field mappings', async () => {
      const payouts = new Map<string, PayoutState>();

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.createPayout({
        providerUserId: PROVIDER_ID,
        bookingId: BOOKING_ID,
        paymentId: PAYMENT_ID,
        amountCents: 5000,
        currency: 'USD',
        createdAt: CREATED_AT,
      });

      expect(result.payoutId).toBe(PAYOUT_ID);
      expect(result.providerUserId).toBe(PROVIDER_ID);
      expect(result.bookingId).toBe(BOOKING_ID);
      expect(result.paymentId).toBe(PAYMENT_ID);
      expect(result.amountCents).toBe(5000);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('pending');
      expect(result.settlementRef).toBeNull();
      expect(result.createdAt).toBe(CREATED_AT);
      expect(result.settledAt).toBeNull();
    });

    it('returns existing record on conflict (idempotency)', async () => {
      const existingPayout = makePayoutState({ amountCents: 5000 });
      const payouts = new Map<string, PayoutState>([[BOOKING_ID, existingPayout]]);

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      // Insert with identical payload — ON CONFLICT DO NOTHING returns the existing record
      const result = await repository.createPayout({
        providerUserId: PROVIDER_ID,
        bookingId: BOOKING_ID,
        paymentId: PAYMENT_ID,
        amountCents: 5000,
        currency: 'USD',
        createdAt: CREATED_AT,
      });

      expect(result.amountCents).toBe(5000);
      expect(result.bookingId).toBe(BOOKING_ID);
    });

    it('throws when existing payout conflicts with attempted payload', async () => {
      const existingPayout = makePayoutState({ amountCents: 5000 });
      const payouts = new Map<string, PayoutState>([[BOOKING_ID, existingPayout]]);

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      await expect(
        repository.createPayout({
          providerUserId: PROVIDER_ID,
          bookingId: BOOKING_ID,
          paymentId: PAYMENT_ID,
          amountCents: 9999,
          currency: 'USD',
          createdAt: CREATED_AT,
        }),
      ).rejects.toThrow(`Conflicting payout already exists for booking ${BOOKING_ID}.`);
    });
  });

  describe('findPayoutById', () => {
    it('returns null when no rows found', async () => {
      const postgresClient = makePostgresClient(new Map());
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutById(PAYOUT_ID);

      expect(result).toBeNull();
    });

    it('returns the mapped payout record when found', async () => {
      const payout = makePayoutState();
      const payouts = new Map<string, PayoutState>([[BOOKING_ID, payout]]);

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutById(PAYOUT_ID);

      expect(result).not.toBeNull();
      expect(result?.payoutId).toBe(PAYOUT_ID);
      expect(result?.bookingId).toBe(BOOKING_ID);
    });
  });

  describe('findPayoutsByProviderUserId', () => {
    it('returns an array of payouts for the provider', async () => {
      const payout = makePayoutState();
      const payouts = new Map<string, PayoutState>([[BOOKING_ID, payout]]);

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutsByProviderUserId(PROVIDER_ID);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]?.providerUserId).toBe(PROVIDER_ID);
    });

    it('returns empty array when no payouts found', async () => {
      const postgresClient = makePostgresClient(new Map());
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutsByProviderUserId(PROVIDER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('findPayoutByBookingId', () => {
    it('returns null when no rows found', async () => {
      const postgresClient = makePostgresClient(new Map());
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutByBookingId(BOOKING_ID);

      expect(result).toBeNull();
    });

    it('returns the mapped payout record when found', async () => {
      const payout = makePayoutState();
      const payouts = new Map<string, PayoutState>([[BOOKING_ID, payout]]);

      const postgresClient = makePostgresClient(payouts);
      const repository = new PostgresPayoutRepository(postgresClient, postgresConfig);

      const result = await repository.findPayoutByBookingId(BOOKING_ID);

      expect(result).not.toBeNull();
      expect(result?.bookingId).toBe(BOOKING_ID);
      expect(result?.payoutId).toBe(PAYOUT_ID);
    });
  });
});

function makePostgresClient(payouts: Map<string, PayoutState>): PostgresClient {
  return {
    query: async <T>(
      _config: { databaseUrl: string },
      text: string,
      values: readonly unknown[],
    ) => queryAgainstState<T>(payouts, text, values),
    withTransaction: async <T>(fn: () => Promise<T>) => fn(),
  } as unknown as PostgresClient;
}

async function queryAgainstState<T>(
  payouts: Map<string, PayoutState>,
  text: string,
  values: readonly unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  if (text.includes('INSERT INTO payouts')) {
    const existedBeforeInsert = payouts.has(values[1] as string);
    const [providerUserId, bookingId, paymentId, amountCents, currency, createdAt] = values as [
      string,
      string,
      string,
      number,
      string,
      string,
    ];

    if (!payouts.has(bookingId)) {
      payouts.set(bookingId, {
        id: PAYOUT_ID,
        providerUserId,
        bookingId,
        paymentId,
        amountCents,
        currency,
        status: 'pending',
        settlementRef: null,
        createdAt,
        settledAt: null,
      });
    }

    return { rows: [], rowCount: existedBeforeInsert ? 0 : 1 };
  }

  if (text.includes('WHERE booking_id = $1::uuid')) {
    const bookingId = values[0] as string;
    const payout = payouts.get(bookingId);

    if (!payout) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [toRow(payout)] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('WHERE id = $1::uuid')) {
    const payoutId = values[0] as string;
    const payout = Array.from(payouts.values()).find((p) => p.id === payoutId);

    if (!payout) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [toRow(payout)] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('WHERE provider_user_id = $1::uuid')) {
    const providerUserId = values[0] as string;
    const rows = Array.from(payouts.values())
      .filter((p) => p.providerUserId === providerUserId)
      .map(toRow);

    return { rows: rows as T[], rowCount: rows.length };
  }

  throw new Error(`Unhandled mocked SQL query: ${text}`);
}

function toRow(payout: PayoutState) {
  return {
    id: payout.id,
    provider_user_id: payout.providerUserId,
    booking_id: payout.bookingId,
    payment_id: payout.paymentId,
    amount_cents: payout.amountCents,
    currency: payout.currency,
    status: payout.status,
    settlement_ref: payout.settlementRef,
    created_at: payout.createdAt,
    settled_at: payout.settledAt,
  };
}
