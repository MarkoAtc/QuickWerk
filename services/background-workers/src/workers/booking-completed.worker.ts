import type {
  BookingCompletedDomainEvent,
  BookingCompletedDlqMarker,
  BookingCompletedNotificationPayload,
  BookingCompletedWorkerEnvelope,
} from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

const retryStrategy = 'deterministic-exponential-v1' as const;
const defaultBaseBackoffMs = 1000;

export type BookingCompletedAttemptInput = {
  event: BookingCompletedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
  baseBackoffMs?: number;
  now?: Date;
};

export type BookingCompletedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  envelope: BookingCompletedWorkerEnvelope;
};

export function buildBookingCompletedWorkerEnvelope(
  input: Omit<BookingCompletedAttemptInput, 'shouldFail'>,
): BookingCompletedWorkerEnvelope {
  const { event, attempt, maxAttempts, baseBackoffMs = defaultBaseBackoffMs, now = new Date() } = input;
  const backoffMs = Math.max(baseBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempt - 1));

  return {
    eventName: 'booking.completed',
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

export function markBookingCompletedDlq(
  envelope: BookingCompletedWorkerEnvelope,
  now: Date = new Date(),
): BookingCompletedWorkerEnvelope {
  const dlq: BookingCompletedDlqMarker = {
    terminal: true,
    queueName: 'booking.completed.dlq',
    reason: 'max-attempts-exhausted',
    markedAt: now.toISOString(),
  };

  return { ...envelope, dlq };
}

export function buildCompletedEmailNotificationPayload(
  event: BookingCompletedDomainEvent,
  now: Date = new Date(),
): BookingCompletedNotificationPayload {
  return {
    channel: 'email',
    recipientUserId: event.booking.customerUserId,
    bookingId: event.booking.bookingId,
    correlationId: event.correlationId,
    subject: 'Your booking was completed',
    body: `Your "${event.booking.requestedService}" booking has been marked as completed.`,
    queuedAt: now.toISOString(),
  };
}

export function buildCompletedPushNotificationPayload(
  event: BookingCompletedDomainEvent,
  now: Date = new Date(),
): BookingCompletedNotificationPayload {
  return {
    channel: 'push',
    recipientUserId: event.booking.customerUserId,
    bookingId: event.booking.bookingId,
    correlationId: event.correlationId,
    body: `Booking completed for "${event.booking.requestedService}".`,
    queuedAt: now.toISOString(),
  };
}

export function consumeBookingCompletedAttempt(input: BookingCompletedAttemptInput): BookingCompletedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false, baseBackoffMs, now = new Date() } = input;

  const envelope = buildBookingCompletedWorkerEnvelope({
    event,
    attempt,
    maxAttempts,
    baseBackoffMs,
    now,
  });

  logWorkerEvent({
    event: 'booking.completed.worker-consume',
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
      event: 'booking.completed.worker-consume',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: {
        eventId: envelope.event.eventId,
        retry: envelope.retry,
      },
    });

    const emailPayload = buildCompletedEmailNotificationPayload(event, now);
    logWorkerEvent({
      event: 'notification.completed.email.queued',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: { notification: emailPayload },
    });

    const pushPayload = buildCompletedPushNotificationPayload(event, now);
    logWorkerEvent({
      event: 'notification.completed.push.queued',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: { notification: pushPayload },
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
  const finalEnvelope = canRetry ? envelope : markBookingCompletedDlq(envelope, now);

  logWorkerEvent({
    event: 'booking.completed.worker-consume',
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
