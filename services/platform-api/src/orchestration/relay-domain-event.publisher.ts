import { Inject, Injectable } from '@nestjs/common';
import type { BookingAcceptedDomainEvent, BookingDeclinedDomainEvent, PaymentCapturedDomainEvent } from '@quickwerk/domain';
import { consumeBookingDeclinedAttempt, consumePaymentCapturedAttempt } from '@quickwerk/background-workers';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { BookingDomainEventPublisher } from './domain-event.publisher';
import {
  BOOKING_ACCEPTED_RELAY_CLOCK,
  type BookingAcceptedRelayClock,
} from './relay-clock';
import {
  BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY,
  type BookingAcceptedRelayAttemptPolicy,
} from './relay-attempt-policy';
import {
  BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR,
  type RelayAttemptExecutor,
} from './relay-attempt-executor';
import { LoggingBookingDomainEventPublisher } from './logging-domain-event.publisher';

const relayMaxAttempts = 3;
const relayBaseBackoffMs = 1000;

function mapRelayAttemptStatus(workerStatus: 'processed' | 'retry-scheduled' | 'dead-letter') {
  if (workerStatus === 'processed') {
    return 'succeeded' as const;
  }

  if (workerStatus === 'retry-scheduled') {
    return 'started' as const;
  }

  return 'failed' as const;
}

@Injectable()
export class RelayBookingDomainEventPublisher implements BookingDomainEventPublisher {
  constructor(
    private readonly loggingPublisher: LoggingBookingDomainEventPublisher,
    @Inject(BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY)
    private readonly relayAttemptPolicy: BookingAcceptedRelayAttemptPolicy,
    @Inject(BOOKING_ACCEPTED_RELAY_CLOCK)
    private readonly relayClock: BookingAcceptedRelayClock,
    @Inject(BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR)
    private readonly relayAttemptExecutor: RelayAttemptExecutor,
  ) {}

  async publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void> {
    await this.loggingPublisher.publishBookingAccepted(event);

    let finalWorkerResult = await this.relayAttemptExecutor.execute({
      event,
      attempt: 1,
      maxAttempts: relayMaxAttempts,
      baseBackoffMs: relayBaseBackoffMs,
      shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
        event,
        attempt: 1,
        maxAttempts: relayMaxAttempts,
      }),
      now: this.relayClock.now(),
    });

    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.relay.attempt',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });

    for (let attempt = 2; attempt <= relayMaxAttempts && finalWorkerResult.status === 'retry-scheduled'; attempt += 1) {
      finalWorkerResult = await this.relayAttemptExecutor.execute({
        event,
        attempt,
        maxAttempts: relayMaxAttempts,
        baseBackoffMs: relayBaseBackoffMs,
        shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
          event,
          attempt,
          maxAttempts: relayMaxAttempts,
        }),
        now: this.relayClock.now(),
      });

      logStructuredBreadcrumb({
        event: 'booking.accepted.domain-event.relay.attempt',
        correlationId: event.correlationId,
        status: mapRelayAttemptStatus(finalWorkerResult.status),
        details: {
          eventId: event.eventId,
          workerStatus: finalWorkerResult.status,
          workerCorrelationId: finalWorkerResult.correlationId,
          retry: finalWorkerResult.envelope.retry,
          dlq: finalWorkerResult.envelope.dlq,
        },
      });
    }

    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.relay',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });
  }

  /**
   * Publish a booking.declined domain event through the relay retry/DLQ pipeline,
   * mirroring the booking.accepted flow. The logging publisher is called first
   * to preserve the structured audit breadcrumb regardless of relay outcome.
   */
  async publishBookingDeclined(event: BookingDeclinedDomainEvent): Promise<void> {
    await this.loggingPublisher.publishBookingDeclined(event);

    let finalWorkerResult = consumeBookingDeclinedAttempt({
      event,
      attempt: 1,
      maxAttempts: relayMaxAttempts,
      baseBackoffMs: relayBaseBackoffMs,
      shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
        event,
        attempt: 1,
        maxAttempts: relayMaxAttempts,
      }),
      now: this.relayClock.now(),
    });

    logStructuredBreadcrumb({
      event: 'booking.declined.domain-event.relay.attempt',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });

    for (let attempt = 2; attempt <= relayMaxAttempts && finalWorkerResult.status === 'retry-scheduled'; attempt += 1) {
      finalWorkerResult = consumeBookingDeclinedAttempt({
        event,
        attempt,
        maxAttempts: relayMaxAttempts,
        baseBackoffMs: relayBaseBackoffMs,
        shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
          event,
          attempt,
          maxAttempts: relayMaxAttempts,
        }),
        now: this.relayClock.now(),
      });

      logStructuredBreadcrumb({
        event: 'booking.declined.domain-event.relay.attempt',
        correlationId: event.correlationId,
        status: mapRelayAttemptStatus(finalWorkerResult.status),
        details: {
          eventId: event.eventId,
          workerStatus: finalWorkerResult.status,
          workerCorrelationId: finalWorkerResult.correlationId,
          retry: finalWorkerResult.envelope.retry,
          dlq: finalWorkerResult.envelope.dlq,
        },
      });
    }

    logStructuredBreadcrumb({
      event: 'booking.declined.domain-event.relay',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });
  }

  /**
   * Publish a payment.captured domain event through the relay retry/DLQ pipeline,
   * mirroring the booking.accepted and booking.declined flows. The logging publisher
   * is called first to preserve the structured audit breadcrumb regardless of relay outcome.
   */
  async publishPaymentCaptured(event: PaymentCapturedDomainEvent): Promise<void> {
    await this.loggingPublisher.publishPaymentCaptured(event);

    let finalWorkerResult = consumePaymentCapturedAttempt({
      event,
      attempt: 1,
      maxAttempts: relayMaxAttempts,
      baseBackoffMs: relayBaseBackoffMs,
      shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
        event,
        attempt: 1,
        maxAttempts: relayMaxAttempts,
      }),
      now: this.relayClock.now(),
    });

    logStructuredBreadcrumb({
      event: 'payment.captured.domain-event.relay.attempt',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });

    for (let attempt = 2; attempt <= relayMaxAttempts && finalWorkerResult.status === 'retry-scheduled'; attempt += 1) {
      finalWorkerResult = consumePaymentCapturedAttempt({
        event,
        attempt,
        maxAttempts: relayMaxAttempts,
        baseBackoffMs: relayBaseBackoffMs,
        shouldFail: this.relayAttemptPolicy.shouldFailAttempt({
          event,
          attempt,
          maxAttempts: relayMaxAttempts,
        }),
        now: this.relayClock.now(),
      });

      logStructuredBreadcrumb({
        event: 'payment.captured.domain-event.relay.attempt',
        correlationId: event.correlationId,
        status: mapRelayAttemptStatus(finalWorkerResult.status),
        details: {
          eventId: event.eventId,
          workerStatus: finalWorkerResult.status,
          workerCorrelationId: finalWorkerResult.correlationId,
          retry: finalWorkerResult.envelope.retry,
          dlq: finalWorkerResult.envelope.dlq,
        },
      });
    }

    logStructuredBreadcrumb({
      event: 'payment.captured.domain-event.relay',
      correlationId: event.correlationId,
      status: mapRelayAttemptStatus(finalWorkerResult.status),
      details: {
        eventId: event.eventId,
        workerStatus: finalWorkerResult.status,
        workerCorrelationId: finalWorkerResult.correlationId,
        retry: finalWorkerResult.envelope.retry,
        dlq: finalWorkerResult.envelope.dlq,
      },
    });
  }
}