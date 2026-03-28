import type {
  BookingDeclinedDomainEvent,
  BookingDeclinedDlqMarker,
  BookingDeclinedWorkerEnvelope,
} from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

const retryStrategy = 'deterministic-exponential-v1' as const;
const defaultBaseBackoffMs = 1000;

export type BookingDeclinedAttemptInput = {
  event: BookingDeclinedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
  baseBackoffMs?: number;
  now?: Date;
};

export type BookingDeclinedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  envelope: BookingDeclinedWorkerEnvelope;
};

export function buildBookingDeclinedWorkerEnvelope(
  input: Omit<BookingDeclinedAttemptInput, 'shouldFail'>,
): BookingDeclinedWorkerEnvelope {
  const { event, attempt, maxAttempts, baseBackoffMs = defaultBaseBackoffMs, now = new Date() } = input;
  const backoffMs = Math.max(baseBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempt - 1));

  return {
    eventName: 'booking.declined',
    correlationId: event.correlationId,
    event,
    retry: {
      strategy: retryStrategy,
      attempt,
      maxAttempts,
      backoffMs,
      nextAttemptAt: new Date(now.getTime() + backoffMs).toISOString(),
    },
  };
}

export function markBookingDeclinedDlq(
  envelope: BookingDeclinedWorkerEnvelope,
  now: Date = new Date(),
): BookingDeclinedWorkerEnvelope {
  const dlq: BookingDeclinedDlqMarker = {
    terminal: true,
    queueName: 'booking.declined.dlq',
    reason: 'max-attempts-exhausted',
    markedAt: now.toISOString(),
  };

  return { ...envelope, dlq };
}

export function consumeBookingDeclinedAttempt(input: BookingDeclinedAttemptInput): BookingDeclinedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false, baseBackoffMs, now } = input;

  const envelope = buildBookingDeclinedWorkerEnvelope({
    event,
    attempt,
    maxAttempts,
    baseBackoffMs,
    now,
  });

  logWorkerEvent({
    event: 'booking.declined.worker-consume',
    correlationId: envelope.correlationId,
    status: 'started',
    details: {
      eventId: envelope.event.eventId,
      bookingId: envelope.event.booking.bookingId,
      replayed: envelope.event.replayed,
      retry: envelope.retry,
    },
  });

  if (!shouldFail) {
    logWorkerEvent({
      event: 'booking.declined.worker-consume',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: {
        eventId: envelope.event.eventId,
        retry: envelope.retry,
      },
    });

    return {
      status: 'processed',
      attempt,
      maxAttempts,
      correlationId: envelope.correlationId,
      envelope,
    };
  }

  const canRetry = attempt < maxAttempts;
  const finalEnvelope = canRetry ? envelope : markBookingDeclinedDlq(envelope, now);

  logWorkerEvent({
    event: 'booking.declined.worker-consume',
    correlationId: finalEnvelope.correlationId,
    status: canRetry ? 'retrying' : 'failed',
    details: {
      eventId: finalEnvelope.event.eventId,
      outcome: canRetry ? 'retry-scheduled' : 'dead-letter',
      retry: finalEnvelope.retry,
      dlq: finalEnvelope.dlq,
    },
  });

  return {
    status: canRetry ? 'retry-scheduled' : 'dead-letter',
    attempt,
    maxAttempts,
    correlationId: finalEnvelope.correlationId,
    envelope: finalEnvelope,
  };
}
