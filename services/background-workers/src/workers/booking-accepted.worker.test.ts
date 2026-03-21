import { describe, expect, it } from 'vitest';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

import {
  buildBookingAcceptedWorkerEnvelope,
  consumeBookingAcceptedAttempt,
  markBookingAcceptedDlq,
} from './booking-accepted.worker.js';

function createBookingAcceptedEvent(overrides?: Partial<BookingAcceptedDomainEvent>): BookingAcceptedDomainEvent {
  return {
    eventName: 'booking.accepted',
    eventId: 'evt-booking-accepted-1',
    occurredAt: '2026-03-20T10:00:00.000Z',
    correlationId: 'corr-booking-accepted-1',
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

describe('booking accepted worker envelope/backoff', () => {
  it.each([
    { attempt: 2, expectedBackoffMs: 2000, expectedNextAttemptAt: '2026-03-20T10:00:02.000Z' },
    { attempt: 3, expectedBackoffMs: 4000, expectedNextAttemptAt: '2026-03-20T10:00:04.000Z' },
  ])('builds deterministic retry metadata for attempt $attempt', ({ attempt, expectedBackoffMs, expectedNextAttemptAt }) => {
    const event = createBookingAcceptedEvent();
    const now = new Date('2026-03-20T10:00:00.000Z');

    const envelope = buildBookingAcceptedWorkerEnvelope({
      event,
      attempt,
      maxAttempts: 3,
      now,
    });

    expect(envelope.retry).toEqual({
      strategy: 'deterministic-exponential-v1',
      attempt,
      maxAttempts: 3,
      backoffMs: expectedBackoffMs,
      nextAttemptAt: expectedNextAttemptAt,
    });
  });

  it('marks terminal DLQ metadata for exhausted attempts', () => {
    const event = createBookingAcceptedEvent();
    const envelope = buildBookingAcceptedWorkerEnvelope({
      event,
      attempt: 3,
      maxAttempts: 3,
      now: new Date('2026-03-20T10:00:00.000Z'),
    });

    const marked = markBookingAcceptedDlq(envelope, new Date('2026-03-20T10:00:03.000Z'));

    expect(marked.dlq).toEqual({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-03-20T10:00:03.000Z',
    });
  });
});

describe('consumeBookingAcceptedAttempt', () => {
  it('returns retry-scheduled for failed non-terminal attempts and dead-letter on terminal attempt', () => {
    const event = createBookingAcceptedEvent();

    const retryAttempt = consumeBookingAcceptedAttempt({
      event,
      attempt: 2,
      maxAttempts: 3,
      shouldFail: true,
      now: new Date('2026-03-20T10:00:00.000Z'),
    });

    expect(retryAttempt.status).toBe('retry-scheduled');
    expect(retryAttempt.envelope.retry.backoffMs).toBe(2000);
    expect(retryAttempt.envelope.dlq).toBeUndefined();

    const terminalAttempt = consumeBookingAcceptedAttempt({
      event,
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
      now: new Date('2026-03-20T10:00:01.000Z'),
    });

    expect(terminalAttempt.status).toBe('dead-letter');
    expect(terminalAttempt.envelope.retry.backoffMs).toBe(4000);
    expect(terminalAttempt.envelope.dlq).toEqual({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-03-20T10:00:01.000Z',
    });
  });
});
