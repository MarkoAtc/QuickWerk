import { consumeBookingAcceptedAttempt } from '@quickwerk/background-workers';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { PostgresClient } from '../persistence/postgres-client';
import { requirePostgresPersistenceConfig } from '../persistence/persistence-mode';

export const BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR = Symbol('BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR');

export type RelayAttemptExecutionInput = Parameters<typeof consumeBookingAcceptedAttempt>[0];
export type RelayAttemptExecutionResult = ReturnType<typeof consumeBookingAcceptedAttempt>;

export interface RelayAttemptExecutor {
  execute(input: RelayAttemptExecutionInput): Promise<RelayAttemptExecutionResult>;
}

@Injectable()
export class InMemoryRelayAttemptExecutor implements RelayAttemptExecutor {
  async execute(input: RelayAttemptExecutionInput): Promise<RelayAttemptExecutionResult> {
    return consumeBookingAcceptedAttempt(input);
  }
}

type RelayAttemptQueueStatus = 'queued' | 'processed' | 'retry-scheduled' | 'dead-letter';

type RelayAttemptInsertRow = {
  id: number;
};

type PersistedRelayAttemptRow = {
  id: number;
  eventId: string;
  correlationId: string;
  attempt: number;
  maxAttempts: number;
  status: RelayAttemptQueueStatus;
  payloadSnapshot: Record<string, unknown>;
  retrySnapshot: Record<string, unknown> | null;
  nextAttemptAt: string | null;
  dlqSnapshot: Record<string, unknown> | null;
  terminalMarker: boolean;
};

type RelayQueueMetricsRow = {
  depth: number | string;
  dueCount: number | string;
  deadLetterCount: number | string;
  processingLagMs: number | string | null;
};

@Injectable()
export class PostgresRelayAttemptExecutor implements RelayAttemptExecutor {
  private static readonly maxDueRetryDrainsPerExecute = 8;

  constructor(private readonly postgresClient: PostgresClient) {}

  async execute(input: RelayAttemptExecutionInput): Promise<RelayAttemptExecutionResult> {
    const config = requirePostgresPersistenceConfig(process.env);
    const now = input.now ?? new Date();

    const immediateResult = await this.enqueueAndProcessAttempt(config, {
      ...input,
      now,
    });

    await this.drainDueRetries(config, now);
    await this.logQueueMetrics(config, now, input.event.correlationId);

    return immediateResult;
  }

  private async enqueueAndProcessAttempt(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    input: RelayAttemptExecutionInput,
  ): Promise<RelayAttemptExecutionResult> {
    const payloadSnapshot = buildPayloadSnapshot(input);

    const insertResult = await this.postgresClient.query<RelayAttemptInsertRow>(
      config,
      `/* relay:insert-attempt */
       INSERT INTO booking_accepted_relay_attempts (
         event_id,
         correlation_id,
         attempt,
         max_attempts,
         status,
         payload_snapshot,
         created_at,
         updated_at
       ) VALUES (
         $1,
         $2,
         $3,
         $4,
         'queued',
         $5::jsonb,
         $6::timestamptz,
         $6::timestamptz
       )
       ON CONFLICT (event_id, attempt)
       DO NOTHING
       RETURNING id`,
      [
        input.event.eventId,
        input.event.correlationId,
        input.attempt,
        input.maxAttempts,
        JSON.stringify(payloadSnapshot),
        input.now?.toISOString() ?? new Date().toISOString(),
      ],
    );

    const insertedId = insertResult.rows[0]?.id;

    if (insertedId) {
      return this.processQueuedAttemptById(config, insertedId, input);
    }

    const existingRow = await this.findAttemptRow(config, input.event.eventId, input.attempt);

    if (!existingRow) {
      throw new Error('Failed to resolve relay attempt row after enqueue conflict.');
    }

    if (existingRow.status === 'queued') {
      const replayInput = hydrateInputFromPayload(existingRow.payloadSnapshot, {
        fallbackNow: input.now,
      });
      return this.processQueuedAttemptById(config, existingRow.id, replayInput);
    }

    return mapPersistedRowToExecutionResult(existingRow);
  }

  private async processQueuedAttemptById(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    rowId: number,
    input: RelayAttemptExecutionInput,
  ): Promise<RelayAttemptExecutionResult> {
    const claimResult = await this.postgresClient.query<RelayAttemptInsertRow>(
      config,
      `/* relay:claim-queued */
       UPDATE booking_accepted_relay_attempts
       SET updated_at = $2::timestamptz
       WHERE id = $1
         AND status = 'queued'
       RETURNING id`,
      [rowId, input.now?.toISOString() ?? new Date().toISOString()],
    );

    if (!claimResult.rows[0]?.id) {
      const existing = await this.findAttemptRowById(config, rowId);

      if (!existing) {
        throw new Error(`Relay attempt row ${rowId} disappeared during processing.`);
      }

      return mapPersistedRowToExecutionResult(existing);
    }

    const result = consumeBookingAcceptedAttempt(input);
    const finalizedAt = input.now ?? new Date();

    await this.postgresClient.query(
      config,
      `/* relay:finalize-attempt */
       UPDATE booking_accepted_relay_attempts
       SET status = $1,
           retry_snapshot = $2::jsonb,
           next_attempt_at = $3::timestamptz,
           dlq_snapshot = $4::jsonb,
           terminal_marker = $5,
           processed_at = $6::timestamptz,
           updated_at = $6::timestamptz
       WHERE id = $7`,
      [
        mapWorkerStatusToQueueStatus(result.status),
        JSON.stringify(result.envelope.retry),
        result.envelope.retry.nextAttemptAt,
        result.envelope.dlq ? JSON.stringify(result.envelope.dlq) : null,
        Boolean(result.envelope.dlq?.terminal),
        finalizedAt.toISOString(),
        rowId,
      ],
    );

    return result;
  }

  private async drainDueRetries(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    now: Date,
  ): Promise<void> {
    for (let index = 0; index < PostgresRelayAttemptExecutor.maxDueRetryDrainsPerExecute; index += 1) {
      const claimed = await this.claimDueRetry(config, now);

      if (!claimed) {
        return;
      }

      await this.processQueuedAttemptById(config, claimed.rowId, claimed.input);
    }
  }

  private async claimDueRetry(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    now: Date,
  ): Promise<{ rowId: number; input: RelayAttemptExecutionInput } | null> {
    return this.postgresClient.withTransaction(async (client: PoolClient) => {
      const dueResult = await client.query<PersistedRelayAttemptRow>(
        `/* relay:claim-due-retry */
         SELECT
           q.id AS "id",
           q.event_id AS "eventId",
           q.correlation_id AS "correlationId",
           q.attempt AS "attempt",
           q.max_attempts AS "maxAttempts",
           q.status AS "status",
           q.payload_snapshot AS "payloadSnapshot",
           q.retry_snapshot AS "retrySnapshot",
           q.next_attempt_at::text AS "nextAttemptAt",
           q.dlq_snapshot AS "dlqSnapshot",
           q.terminal_marker AS "terminalMarker"
         FROM booking_accepted_relay_attempts q
         WHERE q.status = 'retry-scheduled'
           AND q.next_attempt_at <= $1::timestamptz
           AND q.attempt < q.max_attempts
           AND NOT EXISTS (
             SELECT 1
             FROM booking_accepted_relay_attempts next_attempt
             WHERE next_attempt.event_id = q.event_id
               AND next_attempt.attempt = q.attempt + 1
           )
         ORDER BY q.next_attempt_at ASC, q.id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [now.toISOString()],
      );

      const dueRow = dueResult.rows[0];

      if (!dueRow) {
        return null;
      }

      const normalizedPayload = normalizeJsonRecord(dueRow.payloadSnapshot);
      const event = normalizedPayload.event as BookingAcceptedDomainEvent;
      const shouldFail = Boolean(normalizedPayload.shouldFail ?? false);
      const baseBackoffMs = Number(normalizedPayload.baseBackoffMs ?? 1000);
      const nextAttempt = dueRow.attempt + 1;

      const nextAttemptInput: RelayAttemptExecutionInput = {
        event,
        attempt: nextAttempt,
        maxAttempts: dueRow.maxAttempts,
        shouldFail,
        baseBackoffMs,
        now,
      };

      const nextPayload = buildPayloadSnapshot(nextAttemptInput);

      const enqueueNextResult = await client.query<RelayAttemptInsertRow>(
        `/* relay:enqueue-from-due */
         INSERT INTO booking_accepted_relay_attempts (
           event_id,
           correlation_id,
           attempt,
           max_attempts,
           status,
           payload_snapshot,
           created_at,
           updated_at
         ) VALUES (
           $1,
           $2,
           $3,
           $4,
           'queued',
           $5::jsonb,
           $6::timestamptz,
           $6::timestamptz
         )
         ON CONFLICT (event_id, attempt)
         DO NOTHING
         RETURNING id`,
        [
          event.eventId,
          event.correlationId,
          nextAttempt,
          dueRow.maxAttempts,
          JSON.stringify(nextPayload),
          now.toISOString(),
        ],
      );

      const nextRowId = enqueueNextResult.rows[0]?.id;

      if (!nextRowId) {
        return null;
      }

      return {
        rowId: nextRowId,
        input: nextAttemptInput,
      };
    });
  }

  private async findAttemptRow(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    eventId: string,
    attempt: number,
  ): Promise<PersistedRelayAttemptRow | null> {
    const result = await this.postgresClient.query<PersistedRelayAttemptRow>(
      config,
      `/* relay:find-attempt */
       SELECT
         id,
         event_id AS "eventId",
         correlation_id AS "correlationId",
         attempt,
         max_attempts AS "maxAttempts",
         status,
         payload_snapshot AS "payloadSnapshot",
         retry_snapshot AS "retrySnapshot",
         next_attempt_at::text AS "nextAttemptAt",
         dlq_snapshot AS "dlqSnapshot",
         terminal_marker AS "terminalMarker"
       FROM booking_accepted_relay_attempts
       WHERE event_id = $1
         AND attempt = $2
       LIMIT 1`,
      [eventId, attempt],
    );

    return result.rows[0] ?? null;
  }

  private async findAttemptRowById(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    id: number,
  ): Promise<PersistedRelayAttemptRow | null> {
    const result = await this.postgresClient.query<PersistedRelayAttemptRow>(
      config,
      `/* relay:find-attempt-by-id */
       SELECT
         id,
         event_id AS "eventId",
         correlation_id AS "correlationId",
         attempt,
         max_attempts AS "maxAttempts",
         status,
         payload_snapshot AS "payloadSnapshot",
         retry_snapshot AS "retrySnapshot",
         next_attempt_at::text AS "nextAttemptAt",
         dlq_snapshot AS "dlqSnapshot",
         terminal_marker AS "terminalMarker"
       FROM booking_accepted_relay_attempts
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  private async logQueueMetrics(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    const result = await this.postgresClient.query<RelayQueueMetricsRow>(
      config,
      `/* relay:queue-metrics */
       SELECT
         COUNT(*) FILTER (WHERE status IN ('queued', 'retry-scheduled')) AS "depth",
         COUNT(*) FILTER (WHERE status = 'retry-scheduled' AND next_attempt_at <= $1::timestamptz) AS "dueCount",
         COUNT(*) FILTER (WHERE status = 'dead-letter') AS "deadLetterCount",
         EXTRACT(
           EPOCH FROM (
             $1::timestamptz - MIN(next_attempt_at) FILTER (
               WHERE status = 'retry-scheduled' AND next_attempt_at <= $1::timestamptz
             )
           )
         ) * 1000 AS "processingLagMs"
       FROM booking_accepted_relay_attempts`,
      [now.toISOString()],
    );

    const metrics = result.rows[0];

    if (!metrics) {
      return;
    }

    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.relay.queue.observability',
      correlationId,
      status: 'started',
      details: {
        depth: Number(metrics.depth),
        dueCount: Number(metrics.dueCount),
        deadLetterCount: Number(metrics.deadLetterCount),
        processingLagMs: metrics.processingLagMs === null ? 0 : Number(metrics.processingLagMs),
      },
    });
  }
}

function buildPayloadSnapshot(input: RelayAttemptExecutionInput): Record<string, unknown> {
  return {
    event: input.event,
    attempt: input.attempt,
    maxAttempts: input.maxAttempts,
    shouldFail: input.shouldFail ?? false,
    baseBackoffMs: input.baseBackoffMs,
  };
}

function hydrateInputFromPayload(
  payloadSnapshot: Record<string, unknown>,
  options: { fallbackNow?: Date },
): RelayAttemptExecutionInput {
  const payload = normalizeJsonRecord(payloadSnapshot);

  return {
    event: payload.event as BookingAcceptedDomainEvent,
    attempt: Number(payload.attempt),
    maxAttempts: Number(payload.maxAttempts),
    shouldFail: Boolean(payload.shouldFail ?? false),
    baseBackoffMs:
      payload.baseBackoffMs === undefined || payload.baseBackoffMs === null
        ? undefined
        : Number(payload.baseBackoffMs),
    now: options.fallbackNow,
  };
}

function normalizeJsonRecord(input: unknown): Record<string, unknown> {
  if (typeof input === 'string') {
    return JSON.parse(input) as Record<string, unknown>;
  }

  if (!input || typeof input !== 'object') {
    return {};
  }

  return input as Record<string, unknown>;
}

function mapPersistedRowToExecutionResult(row: PersistedRelayAttemptRow): RelayAttemptExecutionResult {
  if (row.status === 'queued') {
    throw new Error(`Cannot map queued relay row ${row.id} to execution result before processing.`);
  }

  const payloadSnapshot = normalizeJsonRecord(row.payloadSnapshot);
  const event = payloadSnapshot.event as BookingAcceptedDomainEvent;
  const retrySnapshot = normalizeJsonRecord(row.retrySnapshot);
  const dlqSnapshot = row.dlqSnapshot ? normalizeJsonRecord(row.dlqSnapshot) : undefined;

  return {
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.maxAttempts,
    correlationId: row.correlationId,
    envelope: {
      eventName: 'booking.accepted',
      correlationId: row.correlationId,
      event,
      retry: {
        strategy: 'deterministic-exponential-v1',
        attempt: Number(retrySnapshot.attempt ?? row.attempt),
        maxAttempts: Number(retrySnapshot.maxAttempts ?? row.maxAttempts),
        backoffMs: Number(retrySnapshot.backoffMs ?? 1000),
        nextAttemptAt:
          (retrySnapshot.nextAttemptAt as string | undefined) ??
          row.nextAttemptAt ??
          new Date().toISOString(),
      },
      dlq: dlqSnapshot
        ? {
            terminal: true,
            queueName: 'booking.accepted.dlq',
            reason: 'max-attempts-exhausted',
            markedAt: String(dlqSnapshot.markedAt ?? new Date().toISOString()),
          }
        : undefined,
    },
  };
}

function mapWorkerStatusToQueueStatus(
  status: RelayAttemptExecutionResult['status'],
): RelayAttemptQueueStatus {
  if (status === 'processed') {
    return 'processed';
  }

  if (status === 'retry-scheduled') {
    return 'retry-scheduled';
  }

  return 'dead-letter';
}
