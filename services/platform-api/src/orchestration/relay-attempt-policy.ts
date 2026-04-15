import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';
import { Injectable } from '@nestjs/common';

export const BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY = Symbol('BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY');

export type BookingAcceptedRelayAttemptContext = {
  event:
    | BookingAcceptedDomainEvent
    | BookingCreatedDomainEvent
    | BookingDeclinedDomainEvent
    | BookingCompletedDomainEvent
    | PaymentCapturedDomainEvent;
  attempt: number;
  maxAttempts: number;
};

export interface BookingAcceptedRelayAttemptPolicy {
  shouldFailAttempt(context: BookingAcceptedRelayAttemptContext): boolean;
}

@Injectable()
export class NoopBookingAcceptedRelayAttemptPolicy implements BookingAcceptedRelayAttemptPolicy {
  shouldFailAttempt(): boolean {
    return false;
  }
}
