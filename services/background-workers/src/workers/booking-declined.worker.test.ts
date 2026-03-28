import { describe, expect, it } from 'vitest';

import type { BookingDeclinedDomainEvent } from '@quickwerk/domain';
import {
  buildBookingDeclinedWorkerEnvelope,
  consumeBookingDeclinedAttempt,
  markBookingDeclinedDlq,
} from './booking-declined.worker.js';

const makeDeclinedEvent = (overrides: Partial<BookingDeclinedDomainEvent> = {}): BookingDeclinedDomainEvent => ({
  eventName: 'booking.declined',
  eventId: 'evt-declined-1',
  occurredAt: '2026-03-28T12:00:00.000Z',
  correlationId: 'corr-declined-test',
  replayed: false,
  booking: {
    bookingId: 'booking-1',
    customerUserId: 'customer-1',
    providerUserId: 'provider-1',
    requestedService: 'Tile repair',
    status: 'declined',
  },
  ...overrides,
});

describe('booking-declined worker', () => {
  it('builds envelope with correct retry metadata on first attempt', () => {
    const event = makeDeclinedEvent();
    const envelope = buildBookingDeclinedWorkerEnvelope({
      event,
      attempt: 1,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-28T12:00:00.000Z'),
    });

    expect(envelope.eventName).toBe('booking.declined');
    expect(envelope.correlationId).toBe('corr-declined-test');
    expect(envelope.retry.attempt).toBe(1);
    expect(envelope.retry.maxAttempts).toBe(3);
    expect(envelope.retry.backoffMs).toBe(1000);
    expect(envelope.dlq).toBeUndefined();
  });

  it('applies exponential backoff on subsequent attempts', () => {
    const event = makeDeclinedEvent();
    const envelope2 = buildBookingDeclinedWorkerEnvelope({
      event,
      attempt: 2,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-28T12:00:00.000Z'),
    });
    const envelope3 = buildBookingDeclinedWorkerEnvelope({
      event,
      attempt: 3,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-28T12:00:00.000Z'),
    });

    expect(envelope3.retry.backoffMs).toBeGreaterThan(envelope2.retry.backoffMs);
  });

  it('marks DLQ correctly', () => {
    const event = makeDeclinedEvent();
    const envelope = buildBookingDeclinedWorkerEnvelope({ event, attempt: 3, maxAttempts: 3 });
    const dlqEnvelope = markBookingDeclinedDlq(envelope, new Date('2026-03-28T14:00:00.000Z'));

    expect(dlqEnvelope.dlq).toBeDefined();
    expect(dlqEnvelope.dlq?.terminal).toBe(true);
    expect(dlqEnvelope.dlq?.queueName).toBe('booking.declined.dlq');
    expect(dlqEnvelope.dlq?.reason).toBe('max-attempts-exhausted');
  });

  it('consumeBookingDeclinedAttempt — succeeds on happy path', () => {
    const event = makeDeclinedEvent();
    const result = consumeBookingDeclinedAttempt({ event, attempt: 1, maxAttempts: 3 });

    expect(result.status).toBe('processed');
    expect(result.attempt).toBe(1);
    expect(result.correlationId).toBe('corr-declined-test');
    expect(result.envelope.dlq).toBeUndefined();
  });

  it('consumeBookingDeclinedAttempt — schedules retry when shouldFail and attempts remain', () => {
    const event = makeDeclinedEvent();
    const result = consumeBookingDeclinedAttempt({
      event,
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
    });

    expect(result.status).toBe('retry-scheduled');
    expect(result.envelope.dlq).toBeUndefined();
  });

  it('consumeBookingDeclinedAttempt — dead-letters when max attempts exhausted', () => {
    const event = makeDeclinedEvent();
    const result = consumeBookingDeclinedAttempt({
      event,
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
    });

    expect(result.status).toBe('dead-letter');
    expect(result.envelope.dlq).toBeDefined();
    expect(result.envelope.dlq?.queueName).toBe('booking.declined.dlq');
  });

  it('consumeBookingDeclinedAttempt — carries replayed flag from event', () => {
    const event = makeDeclinedEvent({ replayed: true });
    const result = consumeBookingDeclinedAttempt({ event, attempt: 1, maxAttempts: 3 });

    expect(result.envelope.event.replayed).toBe(true);
  });
});
