import { Inject, Injectable } from '@nestjs/common';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

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

    let finalWorkerResult = this.relayAttemptExecutor.execute({
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
      finalWorkerResult = this.relayAttemptExecutor.execute({
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
}
