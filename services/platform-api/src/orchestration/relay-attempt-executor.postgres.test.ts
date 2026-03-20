import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';
import { afterEach, describe, expect, it } from 'vitest';

import { PostgresClient } from '../persistence/postgres-client';
import { PostgresRelayAttemptExecutor } from './relay-attempt-executor';

type StoredRelayAttempt = {
  id: number;
  eventId: string;
  correlationId: string;
  attempt: number;
  maxAttempts: number;
  status: 'queued' | 'processed' | 'retry-scheduled' | 'dead-letter';
  payloadSnapshot: Record<string, unknown>;
  retrySnapshot: Record<string, unknown> | null;
  nextAttemptAt: string | null;
  dlqSnapshot: Record<string, unknown> | null;
  terminalMarker: boolean;
  statusTransitions: Array<'queued' | 'processed' | 'retry-scheduled' | 'dead-letter'>;
};

class FakePostgresClient {
  private nextId = 1;

  readonly rows = new Map<number, StoredRelayAttempt>();

  async query(_config: unknown, text: string, values: readonly unknown[] = []): Promise<{ rows: unknown[] }> {
    if (text.includes('INSERT INTO booking_accepted_relay_attempts')) {
      const id = this.nextId++;
      this.rows.set(id, {
        id,
        eventId: values[0] as string,
        correlationId: values[1] as string,
        attempt: values[2] as number,
        maxAttempts: values[3] as number,
        status: 'queued',
        payloadSnapshot: JSON.parse(values[4] as string) as Record<string, unknown>,
        retrySnapshot: null,
        nextAttemptAt: null,
        dlqSnapshot: null,
        terminalMarker: false,
        statusTransitions: ['queued'],
      });

      return { rows: [{ id }] };
    }

    if (text.includes('UPDATE booking_accepted_relay_attempts')) {
      const id = values[6] as number;
      const row = this.rows.get(id);

      if (!row) {
        throw new Error(`Missing fake row with id ${id}`);
      }

      row.status = values[0] as StoredRelayAttempt['status'];
      row.retrySnapshot = JSON.parse(values[1] as string) as Record<string, unknown>;
      row.nextAttemptAt = values[2] as string | null;
      row.dlqSnapshot = values[3] ? (JSON.parse(values[3] as string) as Record<string, unknown>) : null;
      row.terminalMarker = Boolean(values[4]);
      row.statusTransitions.push(row.status);

      return { rows: [] };
    }

    throw new Error(`Unexpected SQL in fake client: ${text}`);
  }
}

function createBookingAcceptedEvent(overrides?: Partial<BookingAcceptedDomainEvent>): BookingAcceptedDomainEvent {
  return {
    eventName: 'booking.accepted',
    eventId: 'evt-persistent-relay-001',
    occurredAt: '2026-03-20T10:00:00.000Z',
    correlationId: 'corr-persistent-relay-001',
    replayed: false,
    booking: {
      bookingId: 'booking-1',
      customerUserId: 'user-customer-1',
      providerUserId: 'user-provider-1',
      requestedService: 'Emergency plumbing',
      status: 'accepted',
    },
    ...overrides,
  };
}

describe('PostgresRelayAttemptExecutor', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('persists queued -> retry-scheduled transition with retry metadata snapshot', async () => {
    process.env.DATABASE_URL = 'postgres://quickwerk:test@localhost:5432/quickwerk';

    const fakeClient = new FakePostgresClient();
    const executor = new PostgresRelayAttemptExecutor(fakeClient as unknown as PostgresClient);

    const result = await executor.execute({
      event: createBookingAcceptedEvent(),
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
      now: new Date('2026-03-20T10:00:00.000Z'),
    });

    expect(result.status).toBe('retry-scheduled');
    expect(result.correlationId).toBe('corr-persistent-relay-001');

    const persisted = [...fakeClient.rows.values()][0];
    expect(persisted.statusTransitions).toEqual(['queued', 'retry-scheduled']);
    expect(persisted.correlationId).toBe('corr-persistent-relay-001');
    expect(persisted.payloadSnapshot.event).toMatchObject({
      eventId: 'evt-persistent-relay-001',
      correlationId: 'corr-persistent-relay-001',
    });
    expect(persisted.retrySnapshot).toMatchObject({
      attempt: 1,
      maxAttempts: 3,
      backoffMs: 1000,
    });
    expect(persisted.nextAttemptAt).toBe('2026-03-20T10:00:01.000Z');
    expect(persisted.dlqSnapshot).toBeNull();
    expect(persisted.terminalMarker).toBe(false);
  });

  it('persists queued -> dead-letter transition with terminal DLQ marker snapshot', async () => {
    process.env.DATABASE_URL = 'postgres://quickwerk:test@localhost:5432/quickwerk';

    const fakeClient = new FakePostgresClient();
    const executor = new PostgresRelayAttemptExecutor(fakeClient as unknown as PostgresClient);

    const result = await executor.execute({
      event: createBookingAcceptedEvent({
        eventId: 'evt-persistent-relay-002',
        correlationId: 'corr-persistent-relay-002',
      }),
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
      now: new Date('2026-03-20T10:00:01.000Z'),
    });

    expect(result.status).toBe('dead-letter');
    expect(result.correlationId).toBe('corr-persistent-relay-002');

    const persisted = [...fakeClient.rows.values()][0];
    expect(persisted.statusTransitions).toEqual(['queued', 'dead-letter']);
    expect(persisted.retrySnapshot).toMatchObject({
      attempt: 3,
      maxAttempts: 3,
      backoffMs: 4000,
    });
    expect(persisted.nextAttemptAt).toBe('2026-03-20T10:00:05.000Z');
    expect(persisted.dlqSnapshot).toMatchObject({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-03-20T10:00:01.000Z',
    });
    expect(persisted.terminalMarker).toBe(true);
  });
});
