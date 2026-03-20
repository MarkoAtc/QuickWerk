import { consumeBookingAcceptedAttempt } from '@quickwerk/background-workers';
import { Injectable } from '@nestjs/common';

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

@Injectable()
export class PostgresRelayAttemptExecutor implements RelayAttemptExecutor {
  constructor(private readonly postgresClient: PostgresClient) {}

  async execute(input: RelayAttemptExecutionInput): Promise<RelayAttemptExecutionResult> {
    const config = requirePostgresPersistenceConfig(process.env);
    const enqueuedAt = input.now ?? new Date();

    const payloadSnapshot = {
      event: input.event,
      attempt: input.attempt,
      maxAttempts: input.maxAttempts,
      shouldFail: input.shouldFail ?? false,
      baseBackoffMs: input.baseBackoffMs,
    };

    const enqueueResult = await this.postgresClient.query<RelayAttemptInsertRow>(
      config,
      `INSERT INTO booking_accepted_relay_attempts (
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
       DO UPDATE SET
         correlation_id = EXCLUDED.correlation_id,
         max_attempts = EXCLUDED.max_attempts,
         status = 'queued',
         payload_snapshot = EXCLUDED.payload_snapshot,
         retry_snapshot = NULL,
         next_attempt_at = NULL,
         dlq_snapshot = NULL,
         terminal_marker = FALSE,
         processed_at = NULL,
         updated_at = EXCLUDED.updated_at
       RETURNING id`,
      [
        input.event.eventId,
        input.event.correlationId,
        input.attempt,
        input.maxAttempts,
        JSON.stringify(payloadSnapshot),
        enqueuedAt.toISOString(),
      ],
    );

    const queueRecordId = enqueueResult.rows[0]?.id;

    if (!queueRecordId) {
      throw new Error('Failed to enqueue booking.accepted relay attempt in Postgres transport.');
    }

    const result = consumeBookingAcceptedAttempt(input);
    const finalizedAt = input.now ?? new Date();

    await this.postgresClient.query(
      config,
      `UPDATE booking_accepted_relay_attempts
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
        queueRecordId,
      ],
    );

    return result;
  }
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
