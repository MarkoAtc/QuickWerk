import { randomUUID } from 'node:crypto';

import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
  PaymentRecord,
} from '@quickwerk/domain';
import { Inject, Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import {
  BOOKING_DOMAIN_EVENT_PUBLISHER,
  BookingDomainEventPublisher,
} from '../orchestration/domain-event.publisher';
import { PaymentsService } from '../payments/payments.service';
import { ProvidersService } from '../providers/providers.service';
import { BOOKING_REPOSITORY, BookingRecord, BookingRepository, BookingSummary } from './domain/booking.repository';
import { computeBookingPrice } from './pricing-table';
import { computeSimulatedTracking, SimulatedTracking } from './simulated-tracking';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
    @Inject(BOOKING_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEvents: BookingDomainEventPublisher,
    private readonly paymentsService: PaymentsService,
    private readonly providersService: ProvidersService,
    private readonly authService: AuthService,
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
    input: { requestedService?: string; serviceCategory?: string; urgency?: string; customerLocation?: string },
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
      serviceCategory: input.serviceCategory?.trim() || undefined,
      urgency: input.urgency?.trim() || undefined,
      customerLocation: input.customerLocation?.trim() || undefined,
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

    const createdEvent: BookingCreatedDomainEvent = {
      eventName: 'booking.created',
      eventId: randomUUID(),
      occurredAt: created.createdAt,
      correlationId,
      replayed: false,
      booking: {
        bookingId: created.bookingId,
        customerUserId: created.customerUserId,
        requestedService: created.requestedService,
        customerLocation: created.customerLocation,
        status: 'submitted',
      },
    };

    await this.domainEvents.publishBookingCreated(createdEvent);

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

    const approvalStatus = await this.providersService.getProviderApprovalStatus(session.userId);
    if (approvalStatus !== 'approved') {
      logStructuredBreadcrumb({
        event: 'booking.accept.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'provider-not-approved',
          actorUserId: session.userId,
          bookingId,
          approvalStatus,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Provider approval is required before accepting bookings.',
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
    | { ok: false; statusCode: 403 | 404 | 409 | 500; error: string }
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

    if (bookingToComplete.status === 'completed') {
      const replayedPayment = await this.paymentsService.getPaymentByBookingId(bookingId);

      if (!replayedPayment) {
        logStructuredBreadcrumb({
          event: 'booking.complete.write',
          correlationId,
          status: 'failed',
          details: {
            reason: 'missing-payment-on-replay',
            bookingId,
            actorUserId: session.userId,
          },
        });

        return {
          ok: false,
          statusCode: 500,
          error: 'Booking is completed but no captured payment was found.',
        };
      }

      const replayedPaymentCapturedEvent: PaymentCapturedDomainEvent = {
        eventName: 'payment.captured',
        eventId: randomUUID(),
        occurredAt: replayedPayment.capturedAt,
        correlationId,
        replayed: true,
        payment: {
          paymentId: replayedPayment.paymentId,
          bookingId: replayedPayment.bookingId,
          customerUserId: replayedPayment.customerUserId,
          providerUserId: replayedPayment.providerUserId,
          amountCents: replayedPayment.amountCents,
          currency: replayedPayment.currency,
          status: 'captured',
        },
      };

      if (!bookingToComplete.providerUserId) {
        throw new Error(
          `Cannot complete booking ${bookingId}: missing persisted providerUserId on replayed completion`,
        );
      }

      const replayedBookingCompletedEvent: BookingCompletedDomainEvent = {
        eventName: 'booking.completed',
        eventId: randomUUID(),
        occurredAt: replayedPayment.capturedAt,
        correlationId,
        replayed: true,
        booking: {
          bookingId: bookingToComplete.bookingId,
          customerUserId: bookingToComplete.customerUserId,
          providerUserId: bookingToComplete.providerUserId,
          requestedService: bookingToComplete.requestedService,
          status: 'completed',
        },
      };

      await this.domainEvents.publishBookingCompleted(replayedBookingCompletedEvent);
      await this.domainEvents.publishPaymentCaptured(replayedPaymentCapturedEvent);

      logStructuredBreadcrumb({
        event: 'payment.captured.domain-event.emit',
        correlationId,
        status: 'succeeded',
        details: {
          eventId: replayedPaymentCapturedEvent.eventId,
          paymentId: replayedPayment.paymentId,
          bookingId,
          replayed: true,
        },
      });

      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'succeeded',
        details: {
          bookingId: bookingToComplete.bookingId,
          actorUserId: session.userId,
          replayed: true,
          paymentId: replayedPayment.paymentId,
        },
      });

      return {
        ok: true,
        statusCode: 200,
        booking: this.serializeRecord(bookingToComplete),
        payment: replayedPayment,
      };
    }

    // Validate booking can transition to completed before capturing payment
    if (bookingToComplete.status !== 'accepted') {
      logStructuredBreadcrumb({
        event: 'booking.complete.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'transition-conflict',
          bookingId,
          actorUserId: session.userId,
          currentStatus: bookingToComplete.status,
        },
      });

      return {
        ok: false,
        statusCode: 409,
        error: `Booking cannot transition from ${bookingToComplete.status} to completed.`,
      };
    }

    // Capture payment only after validating transition eligibility
    if (!bookingToComplete.providerUserId) {
      throw new Error(`Cannot complete booking ${bookingId}: missing persisted providerUserId on booking record`);
    }

    let payment: PaymentRecord;
    let paymentReplayed: boolean;

    try {
      const captureResult = await this.paymentsService.capturePaymentForBooking({
        bookingId,
        customerUserId: bookingToComplete.customerUserId,
        providerUserId: bookingToComplete.providerUserId,
        amountCents: computeBookingPrice(bookingToComplete.serviceCategory, bookingToComplete.urgency).totalCents,
        currency: 'EUR',
        capturedAt: completedAt,
        correlationId,
        requestedService: bookingToComplete.requestedService,
      });

      payment = captureResult.payment;
      paymentReplayed = captureResult.replayed;
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

    if (!completed.booking.providerUserId) {
      throw new Error(`Cannot complete booking ${bookingId}: missing persisted providerUserId after completion`);
    }

    const bookingCompletedEvent: BookingCompletedDomainEvent = {
      eventName: 'booking.completed',
      eventId: randomUUID(),
      occurredAt: completedAt,
      correlationId,
      replayed: completed.replayed,
      booking: {
        bookingId: completed.booking.bookingId,
        customerUserId: completed.booking.customerUserId,
        providerUserId: completed.booking.providerUserId,
        requestedService: completed.booking.requestedService,
        status: 'completed',
      },
    };

    await this.domainEvents.publishBookingCompleted(bookingCompletedEvent);
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

    if (!this.isBookingParty(session, booking)) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    const payment = await this.paymentsService.getPaymentByBookingId(bookingId);

    if (!payment) {
      return { ok: false, statusCode: 404, error: 'Payment not found for this booking.' };
    }

    return { ok: true, statusCode: 200, payment };
  }

  /**
   * True only for the booking's own customer or its assigned provider. Deliberately
   * NOT role-branching (`role === 'customer' && ...`) — that shape lets any role that
   * isn't literally 'customer' or 'provider' (e.g. 'operator') fall through both checks
   * and pass unauthorized. Found by CodeRabbit on TEC-98's getBookingTracking and fixed
   * here for all three booking-scoped sensitive-data endpoints that shared the bug.
   */
  private isBookingParty(session: AuthSession, booking: BookingRecord): boolean {
    return booking.customerUserId === session.userId || booking.providerUserId === session.userId;
  }

  /**
   * Booking-scoped provider identity (name, photo, vehicle, license plate) for the
   * active-job screen. Deliberately narrower than public discovery: only a party to
   * this specific booking, once accepted, can see it — vehicle/plate identify a
   * person's vehicle and must not leak through any public or list endpoint.
   */
  async getBookingProviderIdentity(
    session: AuthSession,
    bookingId: string,
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | {
      ok: true;
      statusCode: 200;
      providerIdentity: Awaited<ReturnType<ProvidersService['getProviderIdentitySummary']>>;
    }
  > {
    const booking = await this.bookings.getBooking(bookingId);

    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    if (!this.isBookingParty(session, booking)) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (booking.status !== 'accepted' || !booking.providerUserId) {
      return { ok: true, statusCode: 200, providerIdentity: null };
    }

    const providerIdentity = await this.providersService.getProviderIdentitySummary(booking.providerUserId);
    return { ok: true, statusCode: 200, providerIdentity };
  }

  /**
   * Booking-scoped counterpart phone number for the "Call" affordance on active-job.
   * Same party-and-accepted-only authorization as getBookingProviderIdentity — a phone
   * number is the most sensitive field this app exposes, so this is the ONLY endpoint
   * anywhere in the API surface that returns one. Symmetric by role (customer gets the
   * provider's phone, provider gets the customer's), even though only the customer-facing
   * "Call Provider" UI is wired up today — same authorization shape as the sibling
   * booking-scoped endpoints, not a new pattern.
   */
  async getBookingContact(
    session: AuthSession,
    bookingId: string,
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; statusCode: 200; phone: string | null }
  > {
    const booking = await this.bookings.getBooking(bookingId);

    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    if (!this.isBookingParty(session, booking)) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (booking.status !== 'accepted' || !booking.providerUserId) {
      return { ok: true, statusCode: 200, phone: null };
    }

    const counterpartUserId = session.role === 'provider' ? booking.customerUserId : booking.providerUserId;
    const phone = await this.authService.getPhoneByUserId(counterpartUserId);
    return { ok: true, statusCode: 200, phone };
  }

  /**
   * Booking-scoped simulated en-route tracking (ETA/distance) for the active-job screen.
   * Same party authorization as the sibling booking-scoped endpoints, applied for
   * consistency even though this data is lower-stakes than phone/vehicle. Deterministic
   * and computed on read from the booking's `accepted` timestamp — see
   * simulated-tracking.ts for why that means no state to reset on reload/retry.
   */
  async getBookingTracking(
    session: AuthSession,
    bookingId: string,
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; statusCode: 200; tracking: SimulatedTracking | null }
  > {
    const booking = await this.bookings.getBooking(bookingId);

    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    if (!this.isBookingParty(session, booking)) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (booking.status !== 'accepted') {
      return { ok: true, statusCode: 200, tracking: null };
    }

    const acceptedEvent = booking.statusHistory.find((event) => event.to === 'accepted');

    if (!acceptedEvent) {
      return { ok: true, statusCode: 200, tracking: null };
    }

    const tracking = computeSimulatedTracking(acceptedEvent.changedAt, new Date());
    return { ok: true, statusCode: 200, tracking };
  }

  private serializeRecord(record: BookingRecord) {
    return {
      bookingId: record.bookingId,
      createdAt: record.createdAt,
      customerUserId: record.customerUserId,
      providerUserId: record.providerUserId,
      requestedService: record.requestedService,
      serviceCategory: record.serviceCategory,
      urgency: record.urgency,
      customerLocation: record.customerLocation,
      status: record.status,
      declineReason: record.declineReason,
      statusHistory: record.statusHistory,
    } as const;
  }
}
