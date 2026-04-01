import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { PaymentCapturedDomainEvent } from '@quickwerk/domain';
import {
  buildPaymentCapturedWorkerEnvelope,
  consumePaymentCapturedAttempt,
  markPaymentCapturedDlq,
} from './payment-captured.worker.js';

const makePaymentCapturedEvent = (
  overrides: Partial<PaymentCapturedDomainEvent> = {},
): PaymentCapturedDomainEvent => ({
  eventName: 'payment.captured',
  eventId: 'evt-payment-1',
  occurredAt: '2026-03-31T12:00:00.000Z',
  correlationId: 'corr-payment-test',
  replayed: false,
  payment: {
    paymentId: 'payment-1',
    bookingId: 'booking-1',
    customerUserId: 'customer-1',
    providerUserId: 'provider-1',
    amountCents: 0,
    currency: 'EUR',
    status: 'captured',
  },
  ...overrides,
});

describe('payment-captured worker', () => {
  it('builds envelope with correct retry metadata on first attempt', () => {
    const event = makePaymentCapturedEvent();
    const envelope = buildPaymentCapturedWorkerEnvelope({
      event,
      attempt: 1,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-31T12:00:00.000Z'),
    });

    expect(envelope.eventName).toBe('payment.captured');
    expect(envelope.correlationId).toBe('corr-payment-test');
    expect(envelope.retry.attempt).toBe(1);
    expect(envelope.retry.maxAttempts).toBe(3);
    expect(envelope.retry.backoffMs).toBe(1000);
    expect(envelope.dlq).toBeUndefined();
  });

  it('applies exponential backoff on subsequent attempts', () => {
    const event = makePaymentCapturedEvent();
    const envelope2 = buildPaymentCapturedWorkerEnvelope({
      event,
      attempt: 2,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-31T12:00:00.000Z'),
    });
    const envelope3 = buildPaymentCapturedWorkerEnvelope({
      event,
      attempt: 3,
      maxAttempts: 3,
      baseBackoffMs: 1000,
      now: new Date('2026-03-31T12:00:00.000Z'),
    });

    expect(envelope3.retry.backoffMs).toBeGreaterThan(envelope2.retry.backoffMs);
  });

  it('marks DLQ correctly', () => {
    const event = makePaymentCapturedEvent();
    const envelope = buildPaymentCapturedWorkerEnvelope({ event, attempt: 3, maxAttempts: 3 });
    const dlqEnvelope = markPaymentCapturedDlq(envelope, new Date('2026-03-31T14:00:00.000Z'));

    expect(dlqEnvelope.dlq).toBeDefined();
    expect(dlqEnvelope.dlq?.terminal).toBe(true);
    expect(dlqEnvelope.dlq?.queueName).toBe('payment.captured.dlq');
    expect(dlqEnvelope.dlq?.reason).toBe('max-attempts-exhausted');
  });

  it('consumePaymentCapturedAttempt — succeeds on happy path', () => {
    const event = makePaymentCapturedEvent();
    const result = consumePaymentCapturedAttempt({ event, attempt: 1, maxAttempts: 3 });

    expect(result.status).toBe('processed');
    expect(result.attempt).toBe(1);
    expect(result.correlationId).toBe('corr-payment-test');
    expect(result.envelope.dlq).toBeUndefined();
  });

  it('consumePaymentCapturedAttempt — schedules retry when shouldFail and attempts remain', () => {
    const event = makePaymentCapturedEvent();
    const result = consumePaymentCapturedAttempt({
      event,
      attempt: 1,
      maxAttempts: 3,
      shouldFail: true,
    });

    expect(result.status).toBe('retry-scheduled');
    expect(result.envelope.dlq).toBeUndefined();
  });

  it('consumePaymentCapturedAttempt — dead-letters when max attempts exhausted', () => {
    const event = makePaymentCapturedEvent();
    const result = consumePaymentCapturedAttempt({
      event,
      attempt: 3,
      maxAttempts: 3,
      shouldFail: true,
    });

    expect(result.status).toBe('dead-letter');
    expect(result.envelope.dlq).toBeDefined();
    expect(result.envelope.dlq?.queueName).toBe('payment.captured.dlq');
  });

  it('consumePaymentCapturedAttempt — carries replayed flag from event', () => {
    const event = makePaymentCapturedEvent({ replayed: true });
    const result = consumePaymentCapturedAttempt({ event, attempt: 1, maxAttempts: 3 });

    expect(result.envelope.event.replayed).toBe(true);
  });
});

describe('consumePaymentCapturedAttempt — log breadcrumbs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits started + succeeded breadcrumbs on happy path', () => {
    const event = makePaymentCapturedEvent();
    consumePaymentCapturedAttempt({ event, attempt: 1, maxAttempts: 3 });

    const calls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => JSON.parse(args[0] as string) as { event: string },
    );
    const eventNames = calls.map((c: { event: string }) => c.event);

    expect(eventNames).toContain('payment.captured.worker-consume');
  });

  it('does not emit succeeded breadcrumb when shouldFail is true', () => {
    const event = makePaymentCapturedEvent();
    consumePaymentCapturedAttempt({ event, attempt: 1, maxAttempts: 3, shouldFail: true });

    const calls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args: unknown[]) => JSON.parse(args[0] as string) as { event: string; status: string },
    );
    const succeededCalls = calls.filter((c: { event: string; status: string }) => c.status === 'succeeded');

    expect(succeededCalls).toHaveLength(0);
  });
});
