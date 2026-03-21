import { Injectable } from '@nestjs/common';

export const BOOKING_ACCEPTED_RELAY_CLOCK = Symbol('BOOKING_ACCEPTED_RELAY_CLOCK');

export interface BookingAcceptedRelayClock {
  now(): Date;
}

@Injectable()
export class SystemBookingAcceptedRelayClock implements BookingAcceptedRelayClock {
  now(): Date {
    return new Date();
  }
}
