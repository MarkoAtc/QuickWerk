import { consumeBookingAcceptedAttempt } from '@quickwerk/background-workers';
import { Injectable } from '@nestjs/common';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { BookingDomainEventPublisher } from './domain-event.publisher';
import { LoggingBookingDomainEventPublisher } from './logging-domain-event.publisher';

@Injectable()
export class RelayBookingDomainEventPublisher implements BookingDomainEventPublisher {
  constructor(private readonly loggingPublisher: LoggingBookingDomainEventPublisher) {}

  async publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void> {
    await this.loggingPublisher.publishBookingAccepted(event);

    const workerResult = consumeBookingAcceptedAttempt({
      event,
      attempt: 1,
      maxAttempts: 3,
    });

    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.relay',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: {
        eventId: event.eventId,
        workerStatus: workerResult.status,
        workerCorrelationId: workerResult.correlationId,
        retry: workerResult.envelope.retry,
      },
    });
  }
}
