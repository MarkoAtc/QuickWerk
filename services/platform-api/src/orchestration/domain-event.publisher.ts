import type { BookingAcceptedDomainEvent, BookingDeclinedDomainEvent, PaymentCapturedDomainEvent } from '@quickwerk/domain';

export const BOOKING_DOMAIN_EVENT_PUBLISHER = Symbol('BOOKING_DOMAIN_EVENT_PUBLISHER');

export interface BookingDomainEventPublisher {
  publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void>;
  publishBookingDeclined(event: BookingDeclinedDomainEvent): Promise<void>;
  publishPaymentCaptured(event: PaymentCapturedDomainEvent): Promise<void>;
}