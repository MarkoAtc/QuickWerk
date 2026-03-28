import type { BookingAcceptedDomainEvent, BookingDeclinedDomainEvent } from '@quickwerk/domain';
import { Injectable } from '@nestjs/common';

export const BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY = Symbol('BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY');

export type BookingAcceptedRelayAttemptContext = {
  event: BookingAcceptedDomainEvent | BookingDeclinedDomainEvent;
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
