import { describe, expect, it } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresBookingRepository } from './postgres-booking.repository';

type BookingStatus = 'submitted' | 'accepted';

type BookingState = {
  id: string;
  customerUserId: string;
  providerUserId: string | null;
  requestedService: string;
  status: BookingStatus;
  createdAt: string;
};

type HistoryState = {
  bookingId: string;
  changedAt: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorRole: 'customer' | 'provider';
  actorUserId: string;
};

const postgresConfig = {
  databaseUrl: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
} as const;

describe('PostgresBookingRepository', () => {
  it('persists create -> accept -> conflict flow and immutable history', async () => {
    const bookings = new Map<string, BookingState>();
    const history: HistoryState[] = [];

    const client = {
      query: async <T>(text: string, values: unknown[]) => queryAgainstState<T>(bookings, history, text, values),
    };

    const postgresClient = {
      query: async <T>(
        _config: { databaseUrl: string },
        text: string,
        values: readonly unknown[],
      ) => queryAgainstState<T>(bookings, history, text, values),
      withTransaction: async <T>(
        fn: (txClient: typeof client, config: { databaseUrl: string }) => Promise<T>,
      ) => fn(client, postgresConfig),
    } as unknown as PostgresClient;

    const repository = new PostgresBookingRepository(postgresClient, postgresConfig);

    const created = await repository.createSubmittedBooking({
      createdAt: '2026-03-20T12:00:00.000Z',
      customerUserId: '22222222-2222-4222-8222-222222222222',
      requestedService: 'Plumbing',
      actorRole: 'customer',
      actorUserId: '22222222-2222-4222-8222-222222222222',
    });

    expect(created.status).toBe('submitted');
    expect(created.statusHistory).toHaveLength(1);

    const accepted = await repository.acceptSubmittedBooking({
      bookingId: created.bookingId,
      acceptedAt: '2026-03-20T12:05:00.000Z',
      providerUserId: '33333333-3333-4333-8333-333333333333',
      actorRole: 'provider',
      actorUserId: '33333333-3333-4333-8333-333333333333',
    });

    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.replayed).toBe(false);
      expect(accepted.booking.status).toBe('accepted');
      expect(accepted.booking.providerUserId).toBe('33333333-3333-4333-8333-333333333333');
      expect(accepted.booking.statusHistory).toHaveLength(2);
      expect(accepted.booking.statusHistory[0]?.from).toBeNull();
      expect(accepted.booking.statusHistory[1]?.from).toBe('submitted');
    }

    const replay = await repository.acceptSubmittedBooking({
      bookingId: created.bookingId,
      acceptedAt: '2026-03-20T12:06:00.000Z',
      providerUserId: '33333333-3333-4333-8333-333333333333',
      actorRole: 'provider',
      actorUserId: '33333333-3333-4333-8333-333333333333',
    });

    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.replayed).toBe(true);
      expect(replay.booking.statusHistory).toHaveLength(2);
    }

    const conflict = await repository.acceptSubmittedBooking({
      bookingId: created.bookingId,
      acceptedAt: '2026-03-20T12:07:00.000Z',
      providerUserId: '44444444-4444-4444-8444-444444444444',
      actorRole: 'provider',
      actorUserId: '44444444-4444-4444-8444-444444444444',
    });

    expect(conflict).toEqual({
      ok: false,
      reason: 'transition-conflict',
      currentStatus: 'accepted',
      currentProviderUserId: '33333333-3333-4333-8333-333333333333',
    });

    expect(history).toHaveLength(2);
  });

  it('returns not-found for invalid or missing booking ids', async () => {
    const repository = new PostgresBookingRepository(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        withTransaction: async <T>(fn: () => Promise<T>) => fn(),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    await expect(
      repository.acceptSubmittedBooking({
        bookingId: 'not-a-uuid',
        acceptedAt: '2026-03-20T12:00:00.000Z',
        providerUserId: '33333333-3333-4333-8333-333333333333',
        actorRole: 'provider',
        actorUserId: '33333333-3333-4333-8333-333333333333',
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-found' });
  });
});

async function queryAgainstState<T>(
  bookings: Map<string, BookingState>,
  history: HistoryState[],
  text: string,
  values: readonly unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  if (text.includes('INSERT INTO bookings')) {
    const [id, customerUserId, requestedService, createdAt] = values as [string, string, string, string];
    bookings.set(id, {
      id,
      customerUserId,
      providerUserId: null,
      requestedService,
      status: 'submitted',
      createdAt,
    });
    return { rows: [], rowCount: 1 };
  }

  if (text.includes('INSERT INTO booking_status_history')) {
    const [bookingId, changedAt, fromStatus, toStatus, actorRole, actorUserId] = values as [
      string,
      string,
      BookingStatus | null,
      BookingStatus,
      'customer' | 'provider',
      string,
    ];

    history.push({
      bookingId,
      changedAt,
      fromStatus,
      toStatus,
      actorRole,
      actorUserId,
    });

    return { rows: [], rowCount: 1 };
  }

  if (text.includes('SELECT status, provider_user_id::text FROM bookings')) {
    const bookingId = values[0] as string;
    const booking = bookings.get(bookingId);
    if (!booking) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [{ status: booking.status, provider_user_id: booking.providerUserId }] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('UPDATE bookings')) {
    const [bookingId, providerUserId] = values as [string, string];
    const booking = bookings.get(bookingId);
    if (!booking) {
      return { rows: [], rowCount: 0 };
    }

    booking.status = 'accepted';
    booking.providerUserId = providerUserId;
    bookings.set(bookingId, booking);
    return { rows: [], rowCount: 1 };
  }

  if (text.includes('FROM bookings') && text.includes('WHERE id = $1::uuid')) {
    const bookingId = values[0] as string;
    const booking = bookings.get(bookingId);
    if (!booking) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [
        {
          id: booking.id,
          customer_user_id: booking.customerUserId,
          provider_user_id: booking.providerUserId,
          requested_service: booking.requestedService,
          status: booking.status,
          created_at: booking.createdAt,
        },
      ] as T[],
      rowCount: 1,
    };
  }

  if (text.includes('FROM booking_status_history')) {
    const bookingId = values[0] as string;
    const rows = history
      .filter((event) => event.bookingId === bookingId)
      .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
      .map((event) => ({
        changed_at: event.changedAt,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        actor_role: event.actorRole,
        actor_user_id: event.actorUserId,
      }));

    return { rows: rows as T[], rowCount: rows.length };
  }

  throw new Error(`Unhandled mocked SQL query: ${text}`);
}
