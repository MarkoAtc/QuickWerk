import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PostgresClient } from '../persistence/postgres-client';
import { PostgresRelayAttemptExecutor } from './relay-attempt-executor';

const shouldRun = process.env.RUN_POSTGRES_INTEGRATION_TESTS === '1';
const databaseUrl = process.env.DATABASE_URL;

describe.runIf(shouldRun && Boolean(databaseUrl))('postgres relay dequeue contention integration (optional)', () => {
  const postgresClientA = new PostgresClient();
  const postgresClientB = new PostgresClient();
  const config = {
    databaseUrl: databaseUrl as string,
  };

  const executorA = new PostgresRelayAttemptExecutor(postgresClientA);
  const executorB = new PostgresRelayAttemptExecutor(postgresClientB);

  beforeAll(async () => {
    await postgresClientA.query(
      config,
      'TRUNCATE TABLE booking_accepted_relay_attempts RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await postgresClientA.onApplicationShutdown();
    await postgresClientB.onApplicationShutdown();
  });

  it('prevents double-advance when multiple executors drain due retries concurrently', async () => {
    const event = createBookingAcceptedEvent();
    const seedNow = new Date('2026-03-20T10:00:00.000Z');

    await executorA.execute({
      event,
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
      now: seedNow,
    });

    const contentionNow = new Date('2026-03-20T10:00:01.000Z');
    const contenders = Array.from({ length: 10 }, (_, index) =>
      (index % 2 === 0 ? executorA : executorB).drainDueRetriesTick({
        now: contentionNow,
        maxDrains: 1,
      }),
    );

    await Promise.all(contenders);

    const result = await postgresClientA.query<{
      event_id: string;
      attempt: number;
      status: string;
      correlation_id: string;
    }>(
      config,
      `SELECT event_id, attempt, status, correlation_id
       FROM booking_accepted_relay_attempts
       WHERE event_id = $1
       ORDER BY attempt ASC`,
      [event.eventId],
    );

    expect(result.rows.map((row) => row.attempt)).toEqual([1, 2]);
    expect(result.rows.filter((row) => row.attempt === 2)).toHaveLength(1);
    expect(result.rows[1]?.status).toBe('retry-scheduled');
    expect(result.rows[1]?.correlation_id).toBe(event.correlationId);
  });
});

function createBookingAcceptedEvent(): BookingAcceptedDomainEvent {
  return {
    eventName: 'booking.accepted',
    eventId: 'evt-persistent-relay-contention-001',
    occurredAt: '2026-03-20T10:00:00.000Z',
    correlationId: 'corr-persistent-relay-contention-001',
    replayed: false,
    booking: {
      bookingId: 'booking-contention-1',
      customerUserId: 'user-customer-contention-1',
      providerUserId: 'user-provider-contention-1',
      requestedService: 'Emergency plumbing',
      status: 'accepted',
    },
  };
}
