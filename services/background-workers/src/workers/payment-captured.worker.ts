import type {
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';

import { logWorkerEvent } from '../observability/structured-log.js';

const retryStrategy = 'deterministic-exponential-v1' as const;
const defaultBaseBackoffMs = 1000;

export type PaymentCapturedWorkerEnvelope = {
  eventName: 'payment.captured';
  correlationId: string;
  event: PaymentCapturedDomainEvent;
  retry: {
    strategy: typeof retryStrategy;
    attempt: number;
    maxAttempts: number;
    backoffMs: number;
    nextAttemptAt: string;
  };
  dlq?: {
    terminal: true;
    queueName: 'payment.captured.dlq';
    reason: 'max-attempts-exhausted';
    markedAt: string;
  };
};

export type PaymentCapturedAttemptInput = {
  event: PaymentCapturedDomainEvent;
  attempt: number;
  maxAttempts: number;
  shouldFail?: boolean;
  baseBackoffMs?: number;
  now?: Date;
};

export type PaymentCapturedAttemptResult = {
  status: 'processed' | 'retry-scheduled' | 'dead-letter';
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  envelope: PaymentCapturedWorkerEnvelope;
};

export function buildPaymentCapturedWorkerEnvelope(
  input: Omit<PaymentCapturedAttemptInput, 'shouldFail'>,
): PaymentCapturedWorkerEnvelope {
  const { event, attempt, maxAttempts, baseBackoffMs = defaultBaseBackoffMs, now = new Date() } = input;
  const backoffMs = Math.max(baseBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempt - 1));

  return {
    eventName: 'payment.captured',
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

export function markPaymentCapturedDlq(
  envelope: PaymentCapturedWorkerEnvelope,
  now: Date = new Date(),
): PaymentCapturedWorkerEnvelope {
  return {
    ...envelope,
    dlq: {
      terminal: true,
      queueName: 'payment.captured.dlq',
      reason: 'max-attempts-exhausted',
      markedAt: now.toISOString(),
    },
  };
}

export function consumePaymentCapturedAttempt(input: PaymentCapturedAttemptInput): PaymentCapturedAttemptResult {
  const { event, attempt, maxAttempts, shouldFail = false, baseBackoffMs, now = new Date() } = input;

  const envelope = buildPaymentCapturedWorkerEnvelope({
    event,
    attempt,
    maxAttempts,
    baseBackoffMs,
    now,
  });

  logWorkerEvent({
    event: 'payment.captured.worker-consume',
    correlationId: envelope.correlationId,
    status: 'started',
    details: {
      eventId: envelope.event.eventId,
      paymentId: envelope.event.payment.paymentId,
      bookingId: envelope.event.payment.bookingId,
      replayed: envelope.event.replayed,
      retry: envelope.retry,
    },
  });

  if (!shouldFail) {
    logWorkerEvent({
      event: 'payment.captured.worker-consume',
      correlationId: envelope.correlationId,
      status: 'succeeded',
      details: {
        eventId: envelope.event.eventId,
        retry: envelope.retry,
      },
    });

    logWorkerEvent({
      event: 'payment.captured.worker.invoice-generation.stub',
      correlationId: envelope.correlationId,
      status: 'started',
      details: {
        eventId: envelope.event.eventId,
        bookingId: envelope.event.payment.bookingId,
        paymentId: envelope.event.payment.paymentId,
        note: 'invoice-generation-stub: real PDF generation not yet wired',
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
  const finalEnvelope = canRetry ? envelope : markPaymentCapturedDlq(envelope, now);

  logWorkerEvent({
    event: 'payment.captured.worker-consume',
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
