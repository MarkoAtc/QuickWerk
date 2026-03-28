import type { BookingAcceptedDomainEvent, BookingDeclinedDomainEvent } from '@quickwerk/domain';

export const BOOKING_DOMAIN_EVENT_PUBLISHER = Symbol('BOOKING_DOMAIN_EVENT_PUBLISHER');

export interface BookingDomainEventPublisher {
  publishBookingAccepted(event: BookingAcceptedDomainEvent): Promise<void>;
  publishBookingDeclined(event: BookingDeclinedDomainEvent): Promise<void>;
}
