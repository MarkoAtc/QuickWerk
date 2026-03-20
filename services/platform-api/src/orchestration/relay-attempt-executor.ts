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

export type RelayAttemptQueueStatus = 'queued' | 'processed' | 'retry-scheduled' | 'dead-letter';

export type RelayQueueAttemptSummary = {
  id: number;
  eventId: string;
  correlationId: string;
  attempt: number;
  maxAttempts: number;
  status: RelayAttemptQueueStatus;
  nextAttemptAt: string | null;
  terminalMarker: boolean;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
};

export type RelayQueueMetricsSnapshot = {
  id: number;
  capturedAt: string;
  correlationId: string;
  metrics: RelayQueueMetrics;
};

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

type RelayQueueAttemptSummaryRow = {
  id: number | string;
  eventId: string;
  correlationId: string;
  attempt: number | string;
  maxAttempts: number | string;
  status: RelayAttemptQueueStatus;
  nextAttemptAt: string | null;
  terminalMarker: boolean;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
};

type RelayQueueMetricsRow = {
  depth: number | string;
  dueCount: number | string;
  deadLetterCount: number | string;
  processingLagMs: number | string | null;
};

type RelayQueueMetricSnapshotRow = {
  id: number | string;
  capturedAt: string;
  correlationId: string;
  depth: number | string;
  dueCount: number | string;
  deadLetterCount: number | string;
  processingLagMs: number | string;
};

type RelayQueueMetricSnapshotCountRow = {
  retained: number | string;
};

export type RelayQueueMetrics = {
  depth: number;
  dueCount: number;
  deadLetterCount: number;
  processingLagMs: number;
};

@Injectable()
export class PostgresRelayAttemptExecutor implements RelayAttemptExecutor {
  static readonly defaultMaxDueRetryDrainsPerTick = 8;
  static readonly defaultMaxRetainedQueueMetricSnapshots = 200;

  constructor(private readonly postgresClient: PostgresClient) {}

  static resolveQueueMetricSnapshotRetention(env: NodeJS.ProcessEnv): number {
    const rawValue = env.BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION?.trim();

    if (!rawValue) {
      return PostgresRelayAttemptExecutor.defaultMaxRetainedQueueMetricSnapshots;
    }

    const parsed = Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return PostgresRelayAttemptExecutor.defaultMaxRetainedQueueMetricSnapshots;
    }

    return Math.min(10_000, parsed);
  }

  async execute(input: RelayAttemptExecutionInput): Promise<RelayAttemptExecutionResult> {
    const config = requirePostgresPersistenceConfig(process.env);
    const now = input.now ?? new Date();

    const immediateResult = await this.enqueueAndProcessAttempt(config, {
      ...input,
      now,
    });

    await this.logQueueMetrics(config, now, input.event.correlationId);

    return immediateResult;
  }

  async drainDueRetriesTick(input?: { now?: Date; maxDrains?: number }): Promise<{ drainedCount: number }> {
    const config = requirePostgresPersistenceConfig(process.env);
    const now = input?.now ?? new Date();
    const maxDrains = Math.max(1, input?.maxDrains ?? PostgresRelayAttemptExecutor.defaultMaxDueRetryDrainsPerTick);

    let drainedCount = 0;

    for (let index = 0; index < maxDrains; index += 1) {
      const claimed = await this.claimDueRetry(config, now);

      if (!claimed) {
        break;
      }

      await this.processQueuedAttemptById(config, claimed.rowId, claimed.input);
      drainedCount += 1;
    }

    return { drainedCount };
  }

  async getQueueMetricsSnapshot(input?: { now?: Date }): Promise<RelayQueueMetrics> {
    const config = requirePostgresPersistenceConfig(process.env);
    const now = input?.now ?? new Date();

    return this.loadQueueMetrics(config, now);
  }

  async listQueueAttempts(input?: {
    limit?: number;
    offset?: number;
    status?: RelayAttemptQueueStatus;
    correlationId?: string;
    eventId?: string;
    terminalOnly?: boolean;
  }): Promise<{ items: RelayQueueAttemptSummary[]; hasMore: boolean; nextOffset: number | null }> {
    const config = requirePostgresPersistenceConfig(process.env);
    const limit = clampPaginationLimit(input?.limit, 20, 100);
    const offset = clampPaginationOffset(input?.offset);

    const whereClauses = ['1 = 1'];
    const values: unknown[] = [];

    if (input?.status) {
      values.push(input.status);
      whereClauses.push(`status = $${values.length}`);
    }

    if (input?.correlationId) {
      values.push(input.correlationId);
      whereClauses.push(`correlation_id = $${values.length}`);
    }

    if (input?.eventId) {
      values.push(input.eventId);
      whereClauses.push(`event_id = $${values.length}`);
    }

    if (input?.terminalOnly) {
      whereClauses.push('terminal_marker = TRUE');
    }

    values.push(limit + 1);
    const limitParamIndex = values.length;
    values.push(offset);
    const offsetParamIndex = values.length;

    const query = `/* relay:list-attempts */
      SELECT
        id,
        event_id AS "eventId",
        correlation_id AS "correlationId",
        attempt,
        max_attempts AS "maxAttempts",
        status,
        next_attempt_at::text AS "nextAttemptAt",
        terminal_marker AS "terminalMarker",
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt",
        processed_at::text AS "processedAt"
      FROM booking_accepted_relay_attempts
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}`;

    const result = await this.postgresClient.query<RelayQueueAttemptSummaryRow>(config, query, values);
    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    return {
      items: rows.map(mapQueueAttemptSummaryRow),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    };
  }

  async listQueueMetricSnapshots(input?: {
    limit?: number;
    offset?: number;
    correlationId?: string;
    sinceCapturedAt?: string;
  }): Promise<{ items: RelayQueueMetricsSnapshot[]; hasMore: boolean; nextOffset: number | null; retained: number }> {
    const config = requirePostgresPersistenceConfig(process.env);
    const limit = clampPaginationLimit(input?.limit, 20, 100);
    const offset = clampPaginationOffset(input?.offset);

    const whereClauses = ['1 = 1'];
    const values: unknown[] = [];

    if (input?.correlationId) {
      values.push(input.correlationId);
      whereClauses.push(`correlation_id = $${values.length}`);
    }

    if (input?.sinceCapturedAt) {
      values.push(input.sinceCapturedAt);
      whereClauses.push(`captured_at >= $${values.length}::timestamptz`);
    }

    values.push(limit + 1);
    const limitParamIndex = values.length;
    values.push(offset);
    const offsetParamIndex = values.length;

    const snapshotsResult = await this.postgresClient.query<RelayQueueMetricSnapshotRow>(
      config,
      `/* relay:list-queue-metric-snapshots */
       SELECT
         id,
         captured_at::text AS "capturedAt",
         correlation_id AS "correlationId",
         depth,
         due_count AS "dueCount",
         dead_letter_count AS "deadLetterCount",
         processing_lag_ms AS "processingLagMs"
       FROM booking_accepted_relay_queue_snapshots
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY captured_at DESC, id DESC
       LIMIT $${limitParamIndex}
       OFFSET $${offsetParamIndex}`,
      values,
    );

    const hasMore = snapshotsResult.rows.length > limit;
    const rows = hasMore ? snapshotsResult.rows.slice(0, limit) : snapshotsResult.rows;

    const retainedResult = await this.postgresClient.query<RelayQueueMetricSnapshotCountRow>(
      config,
      `/* relay:count-queue-metric-snapshots */
       SELECT COUNT(*) AS retained
       FROM booking_accepted_relay_queue_snapshots`,
    );

    return {
      items: rows.map((row) => ({
        id: Number(row.id),
        capturedAt: row.capturedAt,
        correlationId: row.correlationId,
        metrics: {
          depth: Number(row.depth),
          dueCount: Number(row.dueCount),
          deadLetterCount: Number(row.deadLetterCount),
          processingLagMs: Number(row.processingLagMs),
        },
      })),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      retained: Number(retainedResult.rows[0]?.retained ?? 0),
    };
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
    const metrics = await this.loadQueueMetrics(config, now);

    await this.recordQueueMetricSnapshot(config, {
      capturedAt: now.toISOString(),
      correlationId,
      metrics,
    });

    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.relay.queue.observability',
      correlationId,
      status: 'started',
      details: metrics,
    });
  }

  private async recordQueueMetricSnapshot(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    input: {
      capturedAt: string;
      correlationId: string;
      metrics: RelayQueueMetrics;
    },
  ): Promise<void> {
    await this.postgresClient.query(
      config,
      `/* relay:insert-queue-metric-snapshot */
       INSERT INTO booking_accepted_relay_queue_snapshots (
         captured_at,
         correlation_id,
         depth,
         due_count,
         dead_letter_count,
         processing_lag_ms
       ) VALUES (
         $1::timestamptz,
         $2,
         $3,
         $4,
         $5,
         $6
       )`,
      [
        input.capturedAt,
        input.correlationId,
        input.metrics.depth,
        input.metrics.dueCount,
        input.metrics.deadLetterCount,
        input.metrics.processingLagMs,
      ],
    );

    const maxSnapshots = PostgresRelayAttemptExecutor.resolveQueueMetricSnapshotRetention(process.env);

    await this.postgresClient.query(
      config,
      `/* relay:cleanup-queue-metric-snapshots */
       WITH stale AS (
         SELECT id
         FROM booking_accepted_relay_queue_snapshots
         ORDER BY captured_at DESC, id DESC
         OFFSET $1
       )
       DELETE FROM booking_accepted_relay_queue_snapshots
       WHERE id IN (SELECT id FROM stale)`,
      [maxSnapshots],
    );
  }

  private async loadQueueMetrics(
    config: ReturnType<typeof requirePostgresPersistenceConfig>,
    now: Date,
  ): Promise<RelayQueueMetrics> {
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
      return {
        depth: 0,
        dueCount: 0,
        deadLetterCount: 0,
        processingLagMs: 0,
      };
    }

    return {
      depth: Number(metrics.depth),
      dueCount: Number(metrics.dueCount),
      deadLetterCount: Number(metrics.deadLetterCount),
      processingLagMs: metrics.processingLagMs === null ? 0 : Number(metrics.processingLagMs),
    };
  }
}

function clampPaginationLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(max, Math.floor(value ?? fallback)));
}

function clampPaginationOffset(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value ?? 0));
}

function mapQueueAttemptSummaryRow(row: RelayQueueAttemptSummaryRow): RelayQueueAttemptSummary {
  return {
    id: Number(row.id),
    eventId: row.eventId,
    correlationId: row.correlationId,
    attempt: Number(row.attempt),
    maxAttempts: Number(row.maxAttempts),
    status: row.status,
    nextAttemptAt: row.nextAttemptAt,
    terminalMarker: Boolean(row.terminalMarker),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    processedAt: row.processedAt,
  };
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
