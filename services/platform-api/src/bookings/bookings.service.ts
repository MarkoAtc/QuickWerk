import { randomUUID } from 'node:crypto';

import type {
  BookingAcceptedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
  PaymentRecord,
} from '@quickwerk/domain';
import { Inject, Injectable } from '@nestjs/common';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import {
  BOOKING_DOMAIN_EVENT_PUBLISHER,
  BookingDomainEventPublisher,
} from '../orchestration/domain-event.publisher';
import { PaymentsService } from '../payments/payments.service';
import { BOOKING_REPOSITORY, BookingRecord, BookingRepository, BookingSummary } from './domain/booking.repository';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
    @Inject(BOOKING_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEvents: BookingDomainEventPublisher,
    private readonly paymentsService: PaymentsService,
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

  async listBookings(session: AuthSession): Promise<BookingSummary[]> {
    if (session.role === 'provider') {
      return this.bookings.listBookings({ scope: 'submitted-only' });
    }

    // customer or operator sees their own bookings
    return this.bookings.listBookings({ scope: 'customer-owned', customerUserId: session.userId });
  }

  async getBooking(session: AuthSession, bookingId: string): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; statusCode: 200; booking: ReturnType<BookingsService['serializeRecord']> }
  > {
    const booking = await this.bookings.getBooking(bookingId);

    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    // Customers can only see their own bookings; providers can see any submitted booking
    if (session.role === 'customer' && booking.customerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    return { ok: true, statusCode: 200, booking: this.serializeRecord(booking) };
  }

  async createBooking(
    session: AuthSession,
    input: { requestedService?: string },
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403; error: string }
    | { ok: true; statusCode: 201; booking: ReturnType<BookingsService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'customer') {
      logStructuredBreadcrumb({
        event: 'booking.create.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only customers can create bookings.',
      };
    }

    const created = await this.bookings.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: session.userId,
      requestedService: input.requestedService?.trim() || 'General handyman help',
      actorRole: session.role,
      actorUserId: session.userId,
    });

    logStructuredBreadcrumb({
      event: 'booking.create.write',
      correlationId,
      status: 'succeeded',
      details: {
        bookingId: created.bookingId,
        actorUserId: session.userId,
      },
    });

    return {
      ok: true,
      statusCode: 201,
      booking: this.serializeRecord(created),
    };
  }

  async acceptBooking(
    session: AuthSession,
    bookingId: string,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404 | 409; error: string }
    | { ok: true; statusCode: 200; booking: ReturnType<BookingsService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'booking.accept.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
          bookingId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can accept bookings.',
      };
    }

    const accepted = await this.bookings.acceptSubmittedBooking({
      bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: session.userId,
      actorRole: session.role,
      actorUserId: session.userId,
    });

    if (!accepted.ok) {
      if (accepted.reason === 'not-found') {
        logStructuredBreadcrumb({
          event: 'booking.accept.write',
          correlationId,
          status: 'failed',
          details: {
            reason: 'not-found',
            bookingId,
            actorUserId: session.userId,
          },
        });

        return {
          ok: false,
          statusCode: 404,
          error: 'Booking not found.',
        };
      }

      logStructuredBreadcrumb({
        event: 'booking.accept.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'transition-conflict',
          bookingId,
          actorUserId: session.userId,
          currentStatus: accepted.currentStatus,
        },
      });

      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${accepted.currentStatus} to accepted.`,
      };
    }

    const acceptedEvent: BookingAcceptedDomainEvent = {
      eventName: 'booking.accepted',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      correlationId,
      replayed: accepted.replayed,
      booking: {
        bookingId: accepted.booking.bookingId,
        customerUserId: accepted.booking.customerUserId,
        providerUserId: accepted.booking.providerUserId ?? session.userId,
        requestedService: accepted.booking.requestedService,
        status: 'accepted',
      },
    };

    await this.domainEvents.publishBookingAccepted(acceptedEvent);

    logStructuredBreadcrumb({
      event: 'booking.accept.write',
      correlationId,
      status: 'succeeded',
      details: {
        bookingId: accepted.booking.bookingId,
        actorUserId: session.userId,
        replayed: accepted.replayed,
      },
    });

    return {
      ok: true,
      statusCode: 200,
      booking: this.serializeRecord(accepted.booking),
    };
  }

  async declineBooking(
    session: AuthSession,
    bookingId: string,
    input: { declineReason?: string },
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404 | 409; error: string }
    | { ok: true; statusCode: 200; booking: ReturnType<BookingsService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'booking.decline.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
          bookingId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can decline bookings.',
      };
    }

    const declined = await this.bookings.declineSubmittedBooking({
      bookingId,
      declinedAt: new Date().toISOString(),
      providerUserId: session.userId,
      actorRole: session.role,
      actorUserId: session.userId,
      declineReason: input.declineReason,
    });

    if (!declined.ok) {
      if (declined.reason === 'not-found') {
        logStructuredBreadcrumb({
          event: 'booking.decline.write',
          correlationId,
          status: 'failed',
          details: {
            reason: 'not-found',
            bookingId,
            actorUserId: session.userId,
          },
        });

        return {
          ok: false,
          statusCode: 404,
          error: 'Booking not found.',
        };
      }

      logStructuredBreadcrumb({
        event: 'booking.decline.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'transition-conflict',
          bookingId,
          actorUserId: session.userId,
          currentStatus: declined.currentStatus,
        },
      });

      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${declined.currentStatus} to declined.`,
      };
    }

    const declinedEvent: BookingDeclinedDomainEvent = {
      eventName: 'booking.declined',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      correlationId,
      replayed: declined.replayed,
      booking: {
        bookingId: declined.booking.bookingId,
        customerUserId: declined.booking.customerUserId,
        providerUserId: declined.booking.providerUserId ?? session.userId,
        requestedService: declined.booking.requestedService,
        status: 'declined',
        declineReason: declined.booking.declineReason,
      },
    };

    await this.domainEvents.publishBookingDeclined(declinedEvent);

    logStructuredBreadcrumb({
      event: 'booking.decline.write',
      correlationId,
      status: 'succeeded',
      details: {
        bookingId: declined.booking.bookingId,
        actorUserId: session.userId,
        replayed: declined.replayed,
      },
    });

    return {
      ok: true,
      statusCode: 200,
      booking: this.serializeRecord(declined.booking),
    };
  }

  async completeBooking(
    session: AuthSession,
    bookingId: string,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404 | 409; error: string }
    | { ok: true; statusCode: 200; booking: ReturnType<BookingsService['serializeRecord']>; payment: PaymentRecord }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
          bookingId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can complete bookings.',
      };
    }

    const completedAt = new Date().toISOString();

    // First, attempt to get the booking to validate it exists and can transition
    const bookingToComplete = await this.bookings.getBooking(bookingId);

    if (!bookingToComplete) {
      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'failed',
        details: { reason: 'not-found', bookingId, actorUserId: session.userId },
      });

      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    // Capture payment BEFORE finalizing the booking to avoid terminal state without payment
    let payment: PaymentRecord;
    let paymentReplayed: boolean;

    try {
      const captureResult = await this.paymentsService.capturePaymentForBooking({
        bookingId,
        customerUserId: bookingToComplete.customerUserId,
        providerUserId: bookingToComplete.providerUserId ?? session.userId,
        amountCents: 0,
        currency: 'EUR',
        capturedAt: completedAt,
        correlationId,
      });

      payment = captureResult.payment;
      paymentReplayed = captureResult.payment.replayed ?? false;
    } catch (error) {
      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'payment-capture-failed',
          bookingId,
          actorUserId: session.userId,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        ok: false,
        statusCode: 500,
        error: 'Payment capture failed. Booking not completed.',
      };
    }

    // Now complete the booking after successful payment capture
    const completed = await this.bookings.completeAcceptedBooking({
      bookingId,
      completedAt,
      providerUserId: session.userId,
      actorRole: session.role,
      actorUserId: session.userId,
    });

    if (!completed.ok) {
      if (completed.reason === 'not-found') {
        logStructuredBreadcrumb({
          event: 'booking.complete.write',
          correlationId,
          status: 'failed',
          details: { reason: 'not-found', bookingId, actorUserId: session.userId },
        });

        return { ok: false, statusCode: 404, error: 'Booking not found.' };
      }

      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'transition-conflict',
          bookingId,
          actorUserId: session.userId,
          currentStatus: completed.currentStatus,
        },
      });

      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${completed.currentStatus} to completed.`,
      };
    }

    const paymentCapturedEvent: PaymentCapturedDomainEvent = {
      eventName: 'payment.captured',
      eventId: randomUUID(),
      occurredAt: completedAt,
      correlationId,
      replayed: paymentReplayed,
      payment: {
        paymentId: payment.paymentId,
        bookingId: payment.bookingId,
        customerUserId: payment.customerUserId,
        providerUserId: payment.providerUserId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        status: 'captured',
      },
    };

    await this.domainEvents.publishPaymentCaptured(paymentCapturedEvent);

    logStructuredBreadcrumb({
      event: 'payment.captured.domain-event.emit',
      correlationId,
      status: 'succeeded',
      details: {
        eventId: paymentCapturedEvent.eventId,
        paymentId: payment.paymentId,
        bookingId,
        replayed: paymentReplayed,
      },
    });

    logStructuredBreadcrumb({
      event: 'booking.complete.write',
      correlationId,
      status: 'succeeded',
      details: {
        bookingId: completed.booking.bookingId,
        actorUserId: session.userId,
        replayed: completed.replayed,
        paymentId: payment.paymentId,
      },
    });

    return {
      ok: true,
      statusCode: 200,
      booking: this.serializeRecord(completed.booking),
      payment,
    };
  }

  async getBookingPayment(
    session: AuthSession,
    bookingId: string,
  ): Promise<
    | { ok: false; statusCode: 401 | 403 | 404; error: string }
    | { ok: true; statusCode: 200; payment: PaymentRecord }
  > {
    if (!session) {
      return { ok: false, statusCode: 401, error: 'Sign-in required.' };
    }

    const booking = await this.bookings.getBooking(bookingId);

    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    // Validate access for both customer and provider
    if (session.role === 'customer' && booking.customerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (session.role === 'provider' && booking.providerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    const payment = await this.paymentsService.getPaymentByBookingId(bookingId);

    if (!payment) {
      return { ok: false, statusCode: 404, error: 'Payment not found for this booking.' };
    }

    return { ok: true, statusCode: 200, payment };
  }

  private serializeRecord(record: BookingRecord) {
    return {
      bookingId: record.bookingId,
      createdAt: record.createdAt,
      customerUserId: record.customerUserId,
      providerUserId: record.providerUserId,
      requestedService: record.requestedService,
      status: record.status,
      declineReason: record.declineReason,
      statusHistory: record.statusHistory,
    } as const;
  }
}