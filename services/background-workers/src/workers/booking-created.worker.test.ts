import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingCreatedDomainEvent } from '@quickwerk/domain';

import {
  buildBookingCreatedWorkerEnvelope,
  buildCreatedEmailNotificationPayload,
  buildCreatedPushNotificationPayload,
  consumeBookingCreatedAttempt,
  markBookingCreatedDlq,
} from './booking-created.worker.js';

const makeCreatedEvent = (overrides: Partial<BookingCreatedDomainEvent> = {}): BookingCreatedDomainEvent => ({
  eventName: 'booking.created',
  eventId: 'evt-created-1',
  occurredAt: '2026-04-15T12:00:00.000Z',
  correlationId: 'corr-created-test',
  replayed: false,
  booking: {
    bookingId: 'booking-1',
    customerUserId: 'customer-1',
    requestedService: 'Plumbing',
    status: 'submitted',
  },
  ...overrides,
});

describe('booking-created worker', () => {
  it('builds envelope and retry metadata', () => {
    const event = makeCreatedEvent();
    const envelope = buildBookingCreatedWorkerEnvelope({
      event,
      attempt: 2,
      maxAttempts: 3,
      now: new Date('2026-04-15T12:00:00.000Z'),
    });

    expect(envelope.eventName).toBe('booking.created');
    expect(envelope.retry.attempt).toBe(2);
    expect(envelope.retry.backoffMs).toBe(2000);
    expect(envelope.retry.nextAttemptAt).toBe('2026-04-15T12:00:02.000Z');
  });

  it('marks terminal DLQ on exhausted attempts', () => {
    const event = makeCreatedEvent();
    const envelope = buildBookingCreatedWorkerEnvelope({ event, attempt: 3, maxAttempts: 3 });
    const dlqEnvelope = markBookingCreatedDlq(envelope, new Date('2026-04-15T12:00:03.000Z'));

    expect(dlqEnvelope.dlq).toEqual({
      terminal: true,
      queueName: 'booking.created.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: '2026-04-15T12:00:03.000Z',
    });
  });

  it('processes, retries, and dead-letters correctly', () => {
    const event = makeCreatedEvent();

    const ok = consumeBookingCreatedAttempt({ event, attempt: 1, maxAttempts: 3 });
    expect(ok.status).toBe('processed');

    const retry = consumeBookingCreatedAttempt({ event, attempt: 2, maxAttempts: 3, shouldFail: true });
    expect(retry.status).toBe('retry-scheduled');
    expect(retry.envelope.dlq).toBeUndefined();

    const deadLetter = consumeBookingCreatedAttempt({
      event,
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
    });
    expect(deadLetter.status).toBe('dead-letter');
    expect(deadLetter.envelope.dlq?.queueName).toBe('booking.created.dlq');
  });
});

describe('created notification payload builders', () => {
  const now = new Date('2026-04-15T12:00:00.000Z');

  it('builds email payload', () => {
    const payload = buildCreatedEmailNotificationPayload(makeCreatedEvent(), now);

    expect(payload.channel).toBe('email');
    expect(payload.recipientUserId).toBe('customer-1');
    expect(payload.bookingId).toBe('booking-1');
    expect(payload.subject).toBe('Your booking request was received');
  });

  it('builds push payload', () => {
    const payload = buildCreatedPushNotificationPayload(makeCreatedEvent(), now);

    expect(payload.channel).toBe('push');
    expect(payload.recipientUserId).toBe('customer-1');
    expect(payload.bookingId).toBe('booking-1');
    expect(payload.subject).toBeUndefined();
  });
});

describe('consumeBookingCreatedAttempt — notification breadcrumbs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits email and push queue breadcrumbs on success', () => {
    consumeBookingCreatedAttempt({
      event: makeCreatedEvent(),
      attempt: 1,
      maxAttempts: 3,
    });

    const events = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => (JSON.parse(args[0] as string) as { event: string }).event,
    );

    expect(events).toContain('notification.created.email.queued');
    expect(events).toContain('notification.created.push.queued');
  });

  it('does not emit notification queue breadcrumbs on failure', () => {
    consumeBookingCreatedAttempt({
      event: makeCreatedEvent(),
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
    });

    const events = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => (JSON.parse(args[0] as string) as { event: string }).event,
    );

    expect(events).not.toContain('notification.created.email.queued');
    expect(events).not.toContain('notification.created.push.queued');
  });
});
