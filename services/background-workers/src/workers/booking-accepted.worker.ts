import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

export type BookingAcceptedAttemptInput = {
  event: BookingAcceptedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
};

export type BookingAcceptedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
};

export function consumeBookingAcceptedAttempt(input: BookingAcceptedAttemptInput): BookingAcceptedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false } = input;

  logWorkerEvent({
    event: 'booking.accepted.worker-consume',
    correlationId: event.correlationId,
    status: 'started',
    details: {
      attempt,
      maxAttempts,
      eventId: event.eventId,
      bookingId: event.booking.bookingId,
      replayed: event.replayed,
    },
  });

  if (!shouldFail) {
    logWorkerEvent({
      event: 'booking.accepted.worker-consume',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: {
        attempt,
        maxAttempts,
        eventId: event.eventId,
      },
    });

    return {
      status: 'processed',
      attempt,
      maxAttempts,
    };
  }

  const canRetry = attempt < maxAttempts;

  logWorkerEvent({
    event: 'booking.accepted.worker-consume',
    correlationId: event.correlationId,
    status: canRetry ? 'retrying' : 'failed',
    details: {
      attempt,
      maxAttempts,
      eventId: event.eventId,
      outcome: canRetry ? 'retry-scheduled' : 'dead-letter',
    },
  });

  return {
    status: canRetry ? 'retry-scheduled' : 'dead-letter',
    attempt,
    maxAttempts,
  };
}
