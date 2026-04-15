import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';

export const BOOKING_DOMAIN_EVENT_PUBLISHER = Symbol('BOOKING_DOMAIN_EVENT_PUBLISHER');

export interface BookingDomainEventPublisher {
  publishBookingCreated(event: BookingCreatedDomainEvent): Promise<void>;
  publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void>;
  publishBookingDeclined(event: BookingDeclinedDomainEvent): Promise<void>;
  publishBookingCompleted(event: BookingCompletedDomainEvent): Promise<void>;
  publishPaymentCaptured(event: PaymentCapturedDomainEvent): Promise<void>;
}
