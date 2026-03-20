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
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusTransitions: Array<'queued' | 'processed' | 'retry-scheduled' | 'dead-letter'>;
};

class FakePostgresClient {
  private nextId = 1;

  readonly rows = new Map<number, StoredRelayAttempt>();
  readonly dueClaimSql: string[] = [];

  async query(_config: unknown, text: string, values: readonly unknown[] = []): Promise<{ rows: unknown[] }> {
    return this.handleQuery(text, values);
  }

  async withTransaction<T>(
    fn: (
      client: {
        query: (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>;
      },
    ) => Promise<T>,
  ): Promise<T> {
    const client = {
      query: (text: string, values: readonly unknown[] = []) => this.handleQuery(text, values),
    };

    return fn(client);
  }

  private async handleQuery(text: string, values: readonly unknown[]): Promise<{ rows: unknown[] }> {
    if (text.includes('relay:insert-attempt') || text.includes('relay:enqueue-from-due')) {
      return this.insertAttempt(values);
    }

    if (text.includes('relay:claim-queued')) {
      return this.claimQueued(values);
    }

    if (text.includes('relay:finalize-attempt')) {
      return this.finalizeAttempt(values);
    }

    if (text.includes('relay:find-attempt-by-id')) {
      return this.findAttemptById(values);
    }

    if (text.includes('relay:find-attempt')) {
      return this.findAttempt(values);
    }

    if (text.includes('relay:claim-due-retry')) {
      this.dueClaimSql.push(text);
      return this.claimDueRetry(values);
    }

    if (text.includes('relay:queue-metrics')) {
      return this.queueMetrics(values);
    }

    throw new Error(`Unexpected SQL in fake client: ${text}`);
  }

  private insertAttempt(values: readonly unknown[]): { rows: unknown[] } {
    const eventId = values[0] as string;
    const attempt = values[2] as number;
    const existing = [...this.rows.values()].find(
      (row) => row.eventId === eventId && row.attempt === attempt,
    );

    if (existing) {
      return { rows: [] };
    }

    const id = this.nextId++;
    const createdAt = values[6] as string;

    this.rows.set(id, {
      id,
      eventId,
      correlationId: values[1] as string,
      attempt,
      maxAttempts: values[3] as number,
      status: 'queued',
      payloadSnapshot: JSON.parse(values[4] as string) as Record<string, unknown>,
      retrySnapshot: null,
      nextAttemptAt: null,
      dlqSnapshot: null,
      terminalMarker: false,
      processedAt: null,
      createdAt,
      updatedAt: createdAt,
      statusTransitions: ['queued'],
    });

    return { rows: [{ id }] };
  }

  private claimQueued(values: readonly unknown[]): { rows: unknown[] } {
    const id = values[0] as number;
    const updatedAt = values[1] as string;
    const row = this.rows.get(id);

    if (!row || row.status !== 'queued') {
      return { rows: [] };
    }

    row.updatedAt = updatedAt;
    return { rows: [{ id }] };
  }

  private finalizeAttempt(values: readonly unknown[]): { rows: unknown[] } {
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
    row.processedAt = values[5] as string;
    row.updatedAt = values[5] as string;
    row.statusTransitions.push(row.status);

    return { rows: [] };
  }

  private findAttemptById(values: readonly unknown[]): { rows: unknown[] } {
    const id = values[0] as number;
    const row = this.rows.get(id);
    return { rows: row ? [this.toPersistedRow(row)] : [] };
  }

  private findAttempt(values: readonly unknown[]): { rows: unknown[] } {
    const eventId = values[0] as string;
    const attempt = values[1] as number;
    const row = [...this.rows.values()].find(
      (item) => item.eventId === eventId && item.attempt === attempt,
    );

    return { rows: row ? [this.toPersistedRow(row)] : [] };
  }

  private claimDueRetry(values: readonly unknown[]): { rows: unknown[] } {
    const now = values[0] as string;

    const dueRows = [...this.rows.values()]
      .filter((row) => {
        if (row.status !== 'retry-scheduled' || !row.nextAttemptAt) {
          return false;
        }

        if (Date.parse(row.nextAttemptAt) > Date.parse(now)) {
          return false;
        }

        return ![...this.rows.values()].some(
          (next) => next.eventId === row.eventId && next.attempt === row.attempt + 1,
        );
      })
      .sort((a, b) => Date.parse(a.nextAttemptAt as string) - Date.parse(b.nextAttemptAt as string));

    const row = dueRows[0];

    return { rows: row ? [this.toPersistedRow(row)] : [] };
  }

  private queueMetrics(values: readonly unknown[]): { rows: unknown[] } {
    const now = values[0] as string;
    const rows = [...this.rows.values()];
    const depth = rows.filter((row) => row.status === 'queued' || row.status === 'retry-scheduled').length;
    const dueRows = rows.filter(
      (row) =>
        row.status === 'retry-scheduled' &&
        row.nextAttemptAt !== null &&
        Date.parse(row.nextAttemptAt) <= Date.parse(now),
    );
    const oldestDue = dueRows
      .map((row) => Date.parse(row.nextAttemptAt as string))
      .sort((a, b) => a - b)
      .at(0);

    return {
      rows: [
        {
          depth,
          dueCount: dueRows.length,
          deadLetterCount: rows.filter((row) => row.status === 'dead-letter').length,
          processingLagMs: oldestDue === undefined ? null : Date.parse(now) - oldestDue,
        },
      ],
    };
  }

  private toPersistedRow(row: StoredRelayAttempt): Record<string, unknown> {
    return {
      id: row.id,
      eventId: row.eventId,
      correlationId: row.correlationId,
      attempt: row.attempt,
      maxAttempts: row.maxAttempts,
      status: row.status,
      payloadSnapshot: row.payloadSnapshot,
      retrySnapshot: row.retrySnapshot,
      nextAttemptAt: row.nextAttemptAt,
      dlqSnapshot: row.dlqSnapshot,
      terminalMarker: row.terminalMarker,
    };
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

    const persisted = [...fakeClient.rows.values()].find((row) => row.attempt === 1);
    expect(persisted?.statusTransitions).toEqual(['queued', 'retry-scheduled']);
    expect(persisted?.correlationId).toBe('corr-persistent-relay-001');
    expect(persisted?.payloadSnapshot.event).toMatchObject({
      eventId: 'evt-persistent-relay-001',
      correlationId: 'corr-persistent-relay-001',
    });
    expect(persisted?.retrySnapshot).toMatchObject({
      attempt: 1,
      maxAttempts: 3,
      backoffMs: 1000,
    });
    expect(persisted?.nextAttemptAt).toBe('2026-03-20T10:00:01.000Z');
    expect(persisted?.dlqSnapshot).toBeNull();
    expect(persisted?.terminalMarker).toBe(false);
  });

  it('dequeues due retry rows via FOR UPDATE SKIP LOCKED and advances retry progression with correlation continuity', async () => {
    process.env.DATABASE_URL = 'postgres://quickwerk:test@localhost:5432/quickwerk';

    const fakeClient = new FakePostgresClient();
    const executor = new PostgresRelayAttemptExecutor(fakeClient as unknown as PostgresClient);

    await executor.execute({
      event: createBookingAcceptedEvent({
        eventId: 'evt-persistent-relay-queue-001',
        correlationId: 'corr-persistent-relay-queue-001',
      }),
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
      now: new Date('2026-03-20T10:00:00.000Z'),
    });

    const beforeTickAttemptTwo = [...fakeClient.rows.values()].find(
      (row) => row.eventId === 'evt-persistent-relay-queue-001' && row.attempt === 2,
    );
    expect(beforeTickAttemptTwo).toBeUndefined();

    const drained = await executor.drainDueRetriesTick({
      now: new Date('2026-03-20T10:00:01.000Z'),
      maxDrains: 1,
    });

    expect(drained.drainedCount).toBe(1);

    const attemptOne = [...fakeClient.rows.values()].find(
      (row) => row.eventId === 'evt-persistent-relay-queue-001' && row.attempt === 1,
    );
    const attemptTwo = [...fakeClient.rows.values()].find(
      (row) => row.eventId === 'evt-persistent-relay-queue-001' && row.attempt === 2,
    );

    expect(attemptOne?.status).toBe('retry-scheduled');
    expect(attemptTwo).toBeTruthy();
    expect(attemptTwo?.statusTransitions).toEqual(['queued', 'retry-scheduled']);
    expect(attemptTwo?.correlationId).toBe('corr-persistent-relay-queue-001');
    expect(attemptTwo?.payloadSnapshot.event).toMatchObject({
      eventId: 'evt-persistent-relay-queue-001',
      correlationId: 'corr-persistent-relay-queue-001',
    });

    expect(fakeClient.dueClaimSql.length).toBeGreaterThan(0);
    expect(fakeClient.dueClaimSql.at(-1)).toContain('FOR UPDATE SKIP LOCKED');
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

    const persisted = [...fakeClient.rows.values()].find((row) => row.eventId === 'evt-persistent-relay-002');
    expect(persisted?.statusTransitions).toEqual(['queued', 'dead-letter']);
    expect(persisted?.retrySnapshot).toMatchObject({
      attempt: 3,
      maxAttempts: 3,
      backoffMs: 4000,
    });
    expect(persisted?.nextAttemptAt).toBe('2026-03-20T10:00:05.000Z');
    expect(persisted?.dlqSnapshot).toMatchObject({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-03-20T10:00:01.000Z',
    });
    expect(persisted?.terminalMarker).toBe(true);
  });
});
