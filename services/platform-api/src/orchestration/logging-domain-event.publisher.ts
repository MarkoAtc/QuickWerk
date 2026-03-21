import { Injectable } from '@nestjs/common';
import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { BookingDomainEventPublisher } from './domain-event.publisher';

@Injectable()
export class LoggingBookingDomainEventPublisher implements BookingDomainEventPublisher {
  async publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: {
        eventName: event.eventName,
        eventId: event.eventId,
        replayed: event.replayed,
        bookingId: event.booking.bookingId,
      },
    });
  }
}
