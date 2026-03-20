import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';

import {
  AcceptSubmittedBookingInput,
  AcceptSubmittedBookingResult,
  BookingRecord,
  BookingRepository,
  BookingStatus,
  BookingStatusEvent,
  CreateSubmittedBookingInput,
} from '../domain/booking.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';

type BookingRow = {
  id: string;
  customer_user_id: string;
  provider_user_id: string | null;
  requested_service: string;
  status: BookingStatus;
  created_at: Date | string;
};

type BookingStatusHistoryRow = {
  changed_at: Date | string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  actor_role: 'customer' | 'provider';
  actor_user_id: string;
};

export class PostgresBookingRepository implements BookingRepository {
  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly postgresConfig: PostgresPersistenceConfig,
  ) {}

  async createSubmittedBooking(input: CreateSubmittedBookingInput): Promise<BookingRecord> {
    const bookingId = randomUUID();

    await this.postgresClient.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO bookings (
          id,
          customer_user_id,
          requested_service,
          status,
          created_at
        ) VALUES ($1::uuid, $2::uuid, $3, 'submitted', $4::timestamptz)`,
        [bookingId, input.customerUserId, input.requestedService, input.createdAt],
      );

      await this.insertStatusEvent(client, {
        bookingId,
        changedAt: input.createdAt,
        fromStatus: null,
        toStatus: 'submitted',
        actorRole: input.actorRole,
        actorUserId: input.actorUserId,
      });

      return null;
    }, {
      ...process.env,
      DATABASE_URL: this.postgresConfig.databaseUrl,
      PERSISTENCE_MODE: 'postgres',
    });

    return this.loadBookingOrThrow(bookingId);
  }

  async acceptSubmittedBooking(input: AcceptSubmittedBookingInput): Promise<AcceptSubmittedBookingResult> {
    if (!isUuid(input.bookingId)) {
      return { ok: false, reason: 'not-found' };
    }

    const result = await this.postgresClient.withTransaction<AcceptSubmittedBookingResult>(async (client) => {
      const currentResult = await client.query<Pick<BookingRow, 'status'>>(
        'SELECT status FROM bookings WHERE id = $1::uuid FOR UPDATE',
        [input.bookingId],
      );

      const current = currentResult.rows[0];

      if (!current) {
        return { ok: false, reason: 'not-found' };
      }

      if (current.status !== 'submitted') {
        return {
          ok: false,
          reason: 'transition-conflict',
          currentStatus: current.status,
        };
      }

      await client.query(
        `UPDATE bookings
         SET status = 'accepted',
             provider_user_id = $2::uuid,
             accepted_at = $3::timestamptz
         WHERE id = $1::uuid`,
        [input.bookingId, input.providerUserId, input.acceptedAt],
      );

      await this.insertStatusEvent(client, {
        bookingId: input.bookingId,
        changedAt: input.acceptedAt,
        fromStatus: 'submitted',
        toStatus: 'accepted',
        actorRole: input.actorRole,
        actorUserId: input.actorUserId,
      });

      const booking = await this.loadBookingById(client, input.bookingId);

      if (!booking) {
        throw new Error(`Failed to load accepted booking ${input.bookingId}.`);
      }

      return {
        ok: true,
        booking,
      };
    }, {
      ...process.env,
      DATABASE_URL: this.postgresConfig.databaseUrl,
      PERSISTENCE_MODE: 'postgres',
    });

    return result;
  }

  private async loadBookingOrThrow(bookingId: string): Promise<BookingRecord> {
    const result = await this.postgresClient.query<BookingRow>(
      this.postgresConfig,
      `SELECT id::text,
              customer_user_id::text,
              provider_user_id::text,
              requested_service,
              status,
              created_at
       FROM bookings
       WHERE id = $1::uuid
       LIMIT 1`,
      [bookingId],
    );

    const booking = result.rows[0];

    if (!booking) {
      throw new Error(`Booking ${bookingId} was not found after write.`);
    }

    const historyResult = await this.postgresClient.query<BookingStatusHistoryRow>(
      this.postgresConfig,
      `SELECT changed_at,
              from_status,
              to_status,
              actor_role,
              actor_user_id::text
       FROM booking_status_history
       WHERE booking_id = $1::uuid
       ORDER BY changed_at ASC, id ASC`,
      [bookingId],
    );

    return mapBookingRecord(booking, historyResult.rows);
  }

  private async loadBookingById(client: PoolClient, bookingId: string): Promise<BookingRecord | null> {
    const result = await client.query<BookingRow>(
      `SELECT id::text,
              customer_user_id::text,
              provider_user_id::text,
              requested_service,
              status,
              created_at
       FROM bookings
       WHERE id = $1::uuid
       LIMIT 1`,
      [bookingId],
    );

    const booking = result.rows[0];

    if (!booking) {
      return null;
    }

    const historyResult = await client.query<BookingStatusHistoryRow>(
      `SELECT changed_at,
              from_status,
              to_status,
              actor_role,
              actor_user_id::text
       FROM booking_status_history
       WHERE booking_id = $1::uuid
       ORDER BY changed_at ASC, id ASC`,
      [bookingId],
    );

    return mapBookingRecord(booking, historyResult.rows);
  }

  private async insertStatusEvent(
    client: PoolClient,
    input: {
      bookingId: string;
      changedAt: string;
      fromStatus: BookingStatus | null;
      toStatus: BookingStatus;
      actorRole: 'customer' | 'provider';
      actorUserId: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO booking_status_history (
        booking_id,
        changed_at,
        from_status,
        to_status,
        actor_role,
        actor_user_id
      ) VALUES (
        $1::uuid,
        $2::timestamptz,
        $3,
        $4,
        $5,
        $6::uuid
      )`,
      [input.bookingId, input.changedAt, input.fromStatus, input.toStatus, input.actorRole, input.actorUserId],
    );
  }
}

function mapBookingRecord(booking: BookingRow, historyRows: BookingStatusHistoryRow[]): BookingRecord {
  const statusHistory: BookingStatusEvent[] = historyRows.map((row) => ({
    changedAt: toIsoString(row.changed_at),
    from: row.from_status,
    to: row.to_status,
    actorRole: row.actor_role,
    actorUserId: row.actor_user_id,
  }));

  return {
    bookingId: booking.id,
    createdAt: toIsoString(booking.created_at),
    customerUserId: booking.customer_user_id,
    providerUserId: booking.provider_user_id ?? undefined,
    requestedService: booking.requested_service,
    status: booking.status,
    statusHistory,
  };
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
