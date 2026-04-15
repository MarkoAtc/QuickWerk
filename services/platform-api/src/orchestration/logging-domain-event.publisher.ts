import { Injectable } from '@nestjs/common';
import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { BookingDomainEventPublisher } from './domain-event.publisher';

type BookingDomainEvent =
  | BookingAcceptedDomainEvent
  | BookingCreatedDomainEvent
  | BookingDeclinedDomainEvent
  | BookingCompletedDomainEvent;
type PaymentDomainEvent = PaymentCapturedDomainEvent;

function buildEventLogDetails(event: BookingDomainEvent) {
  return {
    eventName: event.eventName,
    eventId: event.eventId,
    replayed: event.replayed,
    bookingId: event.booking.bookingId,
  };
}

@Injectable()
export class LoggingBookingDomainEventPublisher implements BookingDomainEventPublisher {
  async publishBookingCreated(event: BookingCreatedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'booking.created.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: buildEventLogDetails(event),
    });
  }

  async publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'booking.accepted.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: buildEventLogDetails(event),
    });
  }

  async publishBookingDeclined(event: BookingDeclinedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'booking.declined.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: buildEventLogDetails(event),
    });
  }

  async publishBookingCompleted(event: BookingCompletedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'booking.completed.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: buildEventLogDetails(event),
    });
  }

  async publishPaymentCaptured(event: PaymentCapturedDomainEvent): Promise<void> {
    logStructuredBreadcrumb({
      event: 'payment.captured.domain-event.emit',
      correlationId: event.correlationId,
      status: 'succeeded',
      details: {
        eventName: event.eventName,
        eventId: event.eventId,
        replayed: event.replayed,
        paymentId: event.payment.paymentId,
        bookingId: event.payment.bookingId,
      },
    });
  }
}
