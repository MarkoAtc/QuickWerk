import { consumeBookingAcceptedAttempt } from '@quickwerk/background-workers';
import { Injectable } from '@nestjs/common';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { BookingDomainEventPublisher } from './domain-event.publisher';
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

function resolveForcedFailuresBeforeSuccess(): number {
  const raw = process.env.BOOKING_ACCEPTED_RELAY_FORCE_FAILURES_BEFORE_SUCCESS;

  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

@Injectable()
export class RelayBookingDomainEventPublisher implements BookingDomainEventPublisher {
  constructor(private readonly loggingPublisher: LoggingBookingDomainEventPublisher) {}

  async publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void> {
    await this.loggingPublisher.publishBookingAccepted(event);

    const forcedFailuresBeforeSuccess = resolveForcedFailuresBeforeSuccess();
    let finalWorkerResult = consumeBookingAcceptedAttempt({
      event,
      attempt: 1,
      maxAttempts: relayMaxAttempts,
      baseBackoffMs: relayBaseBackoffMs,
      shouldFail: forcedFailuresBeforeSuccess > 0,
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
      finalWorkerResult = consumeBookingAcceptedAttempt({
        event,
        attempt,
        maxAttempts: relayMaxAttempts,
        baseBackoffMs: relayBaseBackoffMs,
        shouldFail: attempt <= forcedFailuresBeforeSuccess,
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
