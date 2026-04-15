import type {
  BookingCreatedDomainEvent,
  BookingCreatedDlqMarker,
  BookingCreatedNotificationPayload,
  BookingCreatedWorkerEnvelope,
} from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

const retryStrategy = 'deterministic-exponential-v1' as const;
const defaultBaseBackoffMs = 1000;

export type BookingCreatedAttemptInput = {
  event: BookingCreatedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
  baseBackoffMs?: number;
  now?: Date;
};

export type BookingCreatedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  envelope: BookingCreatedWorkerEnvelope;
};

export function buildBookingCreatedWorkerEnvelope(
  input: Omit<BookingCreatedAttemptInput, 'shouldFail'>,
): BookingCreatedWorkerEnvelope {
  const { event, attempt, maxAttempts, baseBackoffMs = defaultBaseBackoffMs, now = new Date() } = input;
  const backoffMs = Math.max(baseBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempt - 1));

  return {
    eventName: 'booking.created',
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

export function markBookingCreatedDlq(
  envelope: BookingCreatedWorkerEnvelope,
  now: Date = new Date(),
): BookingCreatedWorkerEnvelope {
  const dlq: BookingCreatedDlqMarker = {
    terminal: true,
    queueName: 'booking.created.dlq',
    reason: 'max-attempts-exhausted',
    markedAt: now.toISOString(),
  };

  return { ...envelope, dlq };
}

export function buildCreatedEmailNotificationPayload(
  event: BookingCreatedDomainEvent,
  now: Date = new Date(),
): BookingCreatedNotificationPayload {
  return {
    channel: 'email',
    recipientUserId: event.booking.customerUserId,
    bookingId: event.booking.bookingId,
    correlationId: event.correlationId,
    subject: 'Your booking request was received',
    body: `We received your request for "${event.booking.requestedService}". Providers will be notified shortly.`,
    queuedAt: now.toISOString(),
  };
}

export function buildCreatedPushNotificationPayload(
  event: BookingCreatedDomainEvent,
  now: Date = new Date(),
): BookingCreatedNotificationPayload {
  return {
    channel: 'push',
    recipientUserId: event.booking.customerUserId,
    bookingId: event.booking.bookingId,
    correlationId: event.correlationId,
    body: `Booking received for "${event.booking.requestedService}".`,
    queuedAt: now.toISOString(),
  };
}

export function consumeBookingCreatedAttempt(input: BookingCreatedAttemptInput): BookingCreatedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false, baseBackoffMs, now = new Date() } = input;

  const envelope = buildBookingCreatedWorkerEnvelope({
    event,
    attempt,
    maxAttempts,
    baseBackoffMs,
    now,
  });

  logWorkerEvent({
    event: 'booking.created.worker-consume',
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
      event: 'booking.created.worker-consume',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: {
        eventId: envelope.event.eventId,
        retry: envelope.retry,
      },
    });

    const emailPayload = buildCreatedEmailNotificationPayload(event, now);
    logWorkerEvent({
      event: 'notification.created.email.queued',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: { notification: emailPayload },
    });

    const pushPayload = buildCreatedPushNotificationPayload(event, now);
    logWorkerEvent({
      event: 'notification.created.push.queued',
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
  const finalEnvelope = canRetry ? envelope : markBookingCreatedDlq(envelope, now);

  logWorkerEvent({
    event: 'booking.created.worker-consume',
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
