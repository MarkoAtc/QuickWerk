import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  AcceptSubmittedBookingInput,
  AcceptSubmittedBookingResult,
  BookingRecord,
  BookingRepository,
  BookingSummary,
  CompleteAcceptedBookingInput,
  CompleteAcceptedBookingResult,
  CreateSubmittedBookingInput,
  DeclineSubmittedBookingInput,
  DeclineSubmittedBookingResult,
  ListBookingsFilter,
} from '../domain/booking.repository';

@Injectable()
export class InMemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, BookingRecord>();

  async createSubmittedBooking(input: CreateSubmittedBookingInput): Promise<BookingRecord> {
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

  async acceptSubmittedBooking(input: AcceptSubmittedBookingInput): Promise<AcceptSubmittedBookingResult> {
    const current = this.bookings.get(input.bookingId);

    if (!current) {
      return { ok: false, reason: 'not-found' };
    }

    if (current.status !== 'submitted') {
      if (current.status === 'accepted' && current.providerUserId === input.providerUserId) {
        return {
          ok: true,
          booking: current,
          replayed: true,
        };
      }

      return {
        ok: false,
        reason: 'transition-conflict',
        currentStatus: current.status,
        currentProviderUserId: current.providerUserId,
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
      replayed: false,
    };
  }

  async declineSubmittedBooking(input: DeclineSubmittedBookingInput): Promise<DeclineSubmittedBookingResult> {
    const current = this.bookings.get(input.bookingId);

    if (!current) {
      return { ok: false, reason: 'not-found' };
    }

    if (current.status !== 'submitted') {
      // Idempotent: same provider already declined this booking
      if (current.status === 'declined' && current.providerUserId === input.providerUserId) {
        return { ok: true, booking: current, replayed: true };
      }

      return {
        ok: false,
        reason: 'transition-conflict',
        currentStatus: current.status,
      };
    }

    const declinedEvent = {
      changedAt: input.declinedAt,
      from: current.status,
      to: 'declined' as const,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    };

    const updated: BookingRecord = {
      ...current,
      status: 'declined',
      providerUserId: input.providerUserId,
      declineReason: input.declineReason?.trim() || undefined,
      statusHistory: [...current.statusHistory, declinedEvent],
    };

    this.bookings.set(input.bookingId, updated);

    return { ok: true, booking: updated, replayed: false };
  }

  async completeAcceptedBooking(input: CompleteAcceptedBookingInput): Promise<CompleteAcceptedBookingResult> {
    const current = this.bookings.get(input.bookingId);

    if (!current) {
      return { ok: false, reason: 'not-found' };
    }

    if (current.status !== 'accepted') {
      // Idempotent: same provider already completed this booking
      if (current.status === 'completed' && current.providerUserId === input.providerUserId) {
        return { ok: true, booking: current, replayed: true };
      }

      return {
        ok: false,
        reason: 'transition-conflict',
        currentStatus: current.status,
      };
    }

    const completedEvent = {
      changedAt: input.completedAt,
      from: current.status,
      to: 'completed' as const,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    };

    const updated: BookingRecord = {
      ...current,
      status: 'completed',
      statusHistory: [...current.statusHistory, completedEvent],
    };

    this.bookings.set(input.bookingId, updated);

    return { ok: true, booking: updated, replayed: false };
  }

  async listBookings(filter: ListBookingsFilter): Promise<BookingSummary[]> {
    const all = Array.from(this.bookings.values());

    const filtered =
      filter.scope === 'submitted-only'
        ? all.filter((b) => b.status === 'submitted')
        : all.filter((b) => b.customerUserId === filter.customerUserId);

    return filtered.map((b) => ({
      bookingId: b.bookingId,
      status: b.status,
      requestedService: b.requestedService,
      createdAt: b.createdAt,
      customerUserId: b.customerUserId,
    }));
  }

  async getBooking(bookingId: string): Promise<BookingRecord | null> {
    return this.bookings.get(bookingId) ?? null;
  }
}
