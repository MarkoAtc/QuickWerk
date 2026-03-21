import type {
  BookingAcceptedDomainEvent,
  BookingAcceptedDlqMarker,
  BookingAcceptedWorkerEnvelope,
} from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

const retryStrategy = 'deterministic-exponential-v1' as const;
const defaultBaseBackoffMs = 1000;

export type BookingAcceptedAttemptInput = {
  event: BookingAcceptedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
  baseBackoffMs?: number;
  now?: Date;
};

export type BookingAcceptedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  envelope: BookingAcceptedWorkerEnvelope;
};

export function buildBookingAcceptedWorkerEnvelope(
  input: Omit<BookingAcceptedAttemptInput, 'shouldFail'>,
): BookingAcceptedWorkerEnvelope {
  const { event, attempt, maxAttempts, baseBackoffMs = defaultBaseBackoffMs, now = new Date() } = input;
  const backoffMs = Math.max(baseBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempt - 1));

  return {
    eventName: 'booking.accepted',
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

export function markBookingAcceptedDlq(
  envelope: BookingAcceptedWorkerEnvelope,
  now: Date = new Date(),
): BookingAcceptedWorkerEnvelope {
  const dlq: BookingAcceptedDlqMarker = {
    terminal: true,
    queueName: 'booking.accepted.dlq',
    reason: 'max-attempts-exhausted',
    markedAt: now.toISOString(),
  };

  return {
    ...envelope,
    dlq,
  };
}

export function consumeBookingAcceptedAttempt(input: BookingAcceptedAttemptInput): BookingAcceptedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false, baseBackoffMs, now } = input;

  const envelope = buildBookingAcceptedWorkerEnvelope({
    event,
    attempt,
    maxAttempts,
    baseBackoffMs,
    now,
  });

  logWorkerEvent({
    event: 'booking.accepted.worker-consume',
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
      event: 'booking.accepted.worker-consume',
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
  const finalEnvelope = canRetry ? envelope : markBookingAcceptedDlq(envelope, now);

  logWorkerEvent({
    event: 'booking.accepted.worker-consume',
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
