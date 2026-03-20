import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AuthSession } from '../auth/session-store.service';

type BookingStatus = 'submitted' | 'accepted';

type BookingStatusEvent = {
  changedAt: string;
  from: BookingStatus | null;
  to: BookingStatus;
  actorRole: AuthSession['role'];
  actorUserId: string;
};

type BookingRecord = {
  bookingId: string;
  createdAt: string;
  customerUserId: string;
  providerUserId?: string;
  requestedService: string;
  status: BookingStatus;
  statusHistory: readonly BookingStatusEvent[];
};

@Injectable()
export class BookingsService {
  private readonly bookings = new Map<string, BookingRecord>();

  getMarketplacePreview() {
    return {
      resource: 'marketplace-preview',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          id: 'provider-discovery',
          status: 'preview-ready',
          title: 'Provider discovery preview',
          description:
            'Read-only fixture feed for comparing response speed, trust signals, and first-visit availability.',
          highlights: ['3 local fixture providers', 'service area + response labels', 'review and trust badges'],
          trustBadges: ['ID verified', 'Business docs reviewed'],
          responseSlaHint: 'Median provider response under 8 minutes in pilot fixtures',
          readinessNote: 'Provider card detail is demo-safe and read-only in this slice.',
          dataFreshnessMinutes: 12,
          payloadCompletenessPercent: 92,
          ctaLabel: 'Open provider card',
        },
        {
          id: 'booking-continuation',
          status: 'preview-ready',
          title: 'Booking continuation preview',
          description:
            'Read-only fixture slice showing urgent and scheduled handoff states after auth continuation.',
          highlights: ['urgent + scheduled split', 'next-step summary', 'demo-safe booking context only'],
          trustBadges: ['SLA monitored', 'Status transitions audited'],
          responseSlaHint: 'Urgent preview flow targets first acknowledgement within 5 minutes',
          readinessNote: 'Transition events are preview-only and do not trigger worker jobs yet.',
          dataFreshnessMinutes: 5,
          payloadCompletenessPercent: 88,
          ctaLabel: 'Start booking flow',
        },
      ],
    } as const;
  }

  createBooking(session: AuthSession, input: { requestedService?: string }):
    | { ok: false; statusCode: 403; error: string }
    | { ok: true; statusCode: 201; booking: ReturnType<BookingsService['serializeRecord']> } {
    if (session.role !== 'customer') {
      return {
        ok: false,
        statusCode: 403,
        error: 'Only customers can create bookings.',
      };
    }

    const now = new Date().toISOString();
    const bookingId = randomUUID();
    const initialEvent: BookingStatusEvent = {
      changedAt: now,
      from: null,
      to: 'submitted',
      actorRole: session.role,
      actorUserId: session.userId,
    };

    const record: BookingRecord = {
      bookingId,
      createdAt: now,
      customerUserId: session.userId,
      requestedService: input.requestedService?.trim() || 'General handyman help',
      status: 'submitted',
      statusHistory: [initialEvent],
    };

    this.bookings.set(bookingId, record);

    return {
      ok: true,
      statusCode: 201,
      booking: this.serializeRecord(record),
    };
  }

  acceptBooking(session: AuthSession, bookingId: string):
    | { ok: false; statusCode: 403 | 404 | 409; error: string }
    | { ok: true; statusCode: 200; booking: ReturnType<BookingsService['serializeRecord']> } {
    if (session.role !== 'provider') {
      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can accept bookings.',
      };
    }

    const record = this.bookings.get(bookingId);

    if (!record) {
      return {
        ok: false,
        statusCode: 404,
        error: 'Booking not found.',
      };
    }

    if (record.status !== 'submitted') {
      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${record.status} to accepted.`,
      };
    }

    const acceptedEvent: BookingStatusEvent = {
      changedAt: new Date().toISOString(),
      from: record.status,
      to: 'accepted',
      actorRole: session.role,
      actorUserId: session.userId,
    };

    const updated: BookingRecord = {
      ...record,
      status: 'accepted',
      providerUserId: session.userId,
      statusHistory: [...record.statusHistory, acceptedEvent],
    };

    this.bookings.set(bookingId, updated);

    return {
      ok: true,
      statusCode: 200,
      booking: this.serializeRecord(updated),
    };
  }

  private serializeRecord(record: BookingRecord) {
    return {
      bookingId: record.bookingId,
      createdAt: record.createdAt,
      customerUserId: record.customerUserId,
      providerUserId: record.providerUserId,
      requestedService: record.requestedService,
      status: record.status,
      statusHistory: record.statusHistory,
    } as const;
  }
}
