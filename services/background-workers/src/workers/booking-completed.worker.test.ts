import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingCompletedDomainEvent } from '@quickwerk/domain';

import {
  buildBookingCompletedWorkerEnvelope,
  buildCompletedEmailNotificationPayload,
  buildCompletedPushNotificationPayload,
  consumeBookingCompletedAttempt,
  markBookingCompletedDlq,
} from './booking-completed.worker.js';

const makeCompletedEvent = (overrides: Partial<BookingCompletedDomainEvent> = {}): BookingCompletedDomainEvent => ({
  eventName: 'booking.completed',
  eventId: 'evt-completed-1',
  occurredAt: '2026-04-15T12:00:00.000Z',
  correlationId: 'corr-completed-test',
  replayed: false,
  booking: {
    bookingId: 'booking-1',
    customerUserId: 'customer-1',
    providerUserId: 'provider-1',
    requestedService: 'Plumbing',
    status: 'completed',
  },
  ...overrides,
});

describe('booking-completed worker', () => {
  it('builds envelope and retry metadata', () => {
    const event = makeCompletedEvent();
    const envelope = buildBookingCompletedWorkerEnvelope({
      event,
      attempt: 2,
      maxAttempts: 3,
      now: new Date('2026-04-15T12:00:00.000Z'),
    });

    expect(envelope.eventName).toBe('booking.completed');
    expect(envelope.retry.attempt).toBe(2);
    expect(envelope.retry.backoffMs).toBe(2000);
    expect(envelope.retry.nextAttemptAt).toBe('2026-04-15T12:00:02.000Z');
  });

  it('marks terminal DLQ on exhausted attempts', () => {
    const event = makeCompletedEvent();
    const envelope = buildBookingCompletedWorkerEnvelope({ event, attempt: 3, maxAttempts: 3 });
    const dlqEnvelope = markBookingCompletedDlq(envelope, new Date('2026-04-15T12:00:03.000Z'));

    expect(dlqEnvelope.dlq).toEqual({
      terminal: true,
      queueName: 'booking.completed.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-04-15T12:00:03.000Z',
    });
  });

  it('processes, retries, and dead-letters correctly', () => {
    const event = makeCompletedEvent();

    const ok = consumeBookingCompletedAttempt({ event, attempt: 1, maxAttempts: 3 });
    expect(ok.status).toBe('processed');

    const retry = consumeBookingCompletedAttempt({ event, attempt: 2, maxAttempts: 3, shouldFail: true });
    expect(retry.status).toBe('retry-scheduled');
    expect(retry.envelope.dlq).toBeUndefined();

    const deadLetter = consumeBookingCompletedAttempt({
      event,
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
    });
    expect(deadLetter.status).toBe('dead-letter');
    expect(deadLetter.envelope.dlq?.queueName).toBe('booking.completed.dlq');
  });
});

describe('completed notification payload builders', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('builds email payload', () => {
    const payload = buildCompletedEmailNotificationPayload(makeCompletedEvent(), now);

    expect(payload.channel).toBe('email');
    expect(payload.recipientUserId).toBe('customer-1');
    expect(payload.bookingId).toBe('booking-1');
    expect(payload.subject).toBe('Your booking was completed');
  });

  it('builds push payload', () => {
    const payload = buildCompletedPushNotificationPayload(makeCompletedEvent(), now);

    expect(payload.channel).toBe('push');
    expect(payload.recipientUserId).toBe('customer-1');
    expect(payload.bookingId).toBe('booking-1');
    expect(payload.subject).toBeUndefined();
  });
});

describe('consumeBookingCompletedAttempt — notification breadcrumbs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits email and push queue breadcrumbs on success', () => {
    consumeBookingCompletedAttempt({
      event: makeCompletedEvent(),
      attempt: 1,
      maxAttempts: 3,
    });

    const events = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => (JSON.parse(args[0] as string) as { event: string }).event,
    );

    expect(events).toContain('notification.completed.email.queued');
    expect(events).toContain('notification.completed.push.queued');
  });

  it('does not emit notification queue breadcrumbs on failure', () => {
    consumeBookingCompletedAttempt({
      event: makeCompletedEvent(),
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
    });

    const events = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => (JSON.parse(args[0] as string) as { event: string }).event,
    );

    expect(events).not.toContain('notification.completed.email.queued');
    expect(events).not.toContain('notification.completed.push.queued');
  });
});
