import { Inject, Injectable } from '@nestjs/common';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BOOKING_REPOSITORY, BookingRecord, BookingRepository } from './domain/booking.repository';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
  ) {}

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

    const created = this.bookings.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: session.userId,
      requestedService: input.requestedService?.trim() || 'General handyman help',
      actorRole: session.role,
      actorUserId: session.userId,
    });

    return {
      ok: true,
      statusCode: 201,
      booking: this.serializeRecord(created),
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

    const accepted = this.bookings.acceptSubmittedBooking({
      bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: session.userId,
      actorRole: session.role,
      actorUserId: session.userId,
    });

    if (!accepted.ok) {
      if (accepted.reason === 'not-found') {
        return {
          ok: false,
          statusCode: 404,
          error: 'Booking not found.',
        };
      }

      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${accepted.currentStatus} to accepted.`,
      };
    }

    return {
      ok: true,
      statusCode: 200,
      booking: this.serializeRecord(accepted.booking),
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
