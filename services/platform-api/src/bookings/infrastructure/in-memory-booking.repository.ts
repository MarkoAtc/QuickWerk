import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  AcceptSubmittedBookingInput,
  AcceptSubmittedBookingResult,
  BookingRecord,
  BookingRepository,
  CreateSubmittedBookingInput,
} from '../domain/booking.repository';

@Injectable()
export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, BookingRecord>();

  createSubmittedBooking(input: CreateSubmittedBookingInput): BookingRecord {
    const bookingId = randomUUID();
    const initialEvent = {
      changedAt: input.createdAt,
      from: null,
      to: 'submitted' as const,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    };

    const record: BookingRecord = {
      bookingId,
      createdAt: input.createdAt,
      customerUserId: input.customerUserId,
      requestedService: input.requestedService,
      status: 'submitted',
      statusHistory: [initialEvent],
    };

    this.bookings.set(bookingId, record);

    return record;
  }

  acceptSubmittedBooking(input: AcceptSubmittedBookingInput): AcceptSubmittedBookingResult {
    const current = this.bookings.get(input.bookingId);

    if (!current) {
      return { ok: false, reason: 'not-found' };
    }

    if (current.status !== 'submitted') {
      return {
        ok: false,
        reason: 'transition-conflict',
        currentStatus: current.status,
      };
    }

    const acceptedEvent = {
      changedAt: input.acceptedAt,
      from: current.status,
      to: 'accepted' as const,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    };

    const updated: BookingRecord = {
      ...current,
      status: 'accepted',
      providerUserId: input.providerUserId,
      statusHistory: [...current.statusHistory, acceptedEvent],
    };

    this.bookings.set(input.bookingId, updated);

    return {
      ok: true,
      booking: updated,
    };
  }
}
