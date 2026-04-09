import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  canApplyDisputeOperatorAction,
  disputeOperatorActionTransitions,
  type DisputeOperatorActionType,
  type DisputeRecord,
  type DisputeSubmittedDomainEvent,
} from '@quickwerk/domain';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BOOKING_REPOSITORY, BookingRepository } from '../bookings/domain/booking.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { DISPUTE_REPOSITORY, DisputeRepository } from './domain/dispute.repository';

const validDisputeCategories = new Set<DisputeRecord['category']>([
  'no-show',
  'quality',
  'billing',
  'safety',
  'other',
]);

const isDisputeCategory = (value: string): value is DisputeRecord['category'] =>
  validDisputeCategories.has(value as DisputeRecord['category']);

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DISPUTE_REPOSITORY)
    private readonly disputes: DisputeRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
  ) {}

  async submitDispute(
    session: AuthSession,
    bookingId: string,
    category: string,
    description: string,
    correlationId: string,
  ): Promise<
    { ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 400 | 401 | 403 | 404 | 500; error: string }
  > {
    if (session.role !== 'customer' && session.role !== 'provider') {
      return { ok: false, statusCode: 403, error: 'Only customers or providers can submit disputes.' };
    }

    const booking = await this.bookings.getBooking(bookingId);
    const isParticipant =
      session.role === 'customer'
        ? booking?.customerUserId === session.userId
        : booking?.providerUserId === session.userId;

    if (!booking || !isParticipant) {
      return {
        ok: false,
        statusCode: 403,
        error: 'Not authorized to submit dispute for this booking.',
      };
    }

    if (!isDisputeCategory(category)) {
      return { ok: false, statusCode: 400, error: 'Invalid dispute category.' };
    }

    const existing = await this.disputes.findByBookingIdAndReporter(bookingId, session.userId);

    if (existing) {
      logStructuredBreadcrumb({
        event: 'dispute.submit.write',
        correlationId,
        status: 'succeeded',
        details: {
          disputeId: existing.disputeId,
          bookingId,
          replayed: true,
        },
      });

      return { ok: true, dispute: existing };
    }

    const reporterRole = session.role === 'customer' ? 'customer' : 'provider';

    const dispute: DisputeRecord = {
      disputeId: randomUUID(),
      bookingId,
      reporterUserId: session.userId,
      reporterRole,
      category,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionNote: null,
    };

    const saved = await this.disputes.save(dispute);
    if (!saved.ok) {
      logStructuredBreadcrumb({
        event: 'dispute.submit.write',
        correlationId,
        status: 'failed',
        details: { bookingId, disputeId: dispute.disputeId },
      });
      return { ok: false, statusCode: 500, error: 'Failed to persist dispute.' };
    }

    const event: DisputeSubmittedDomainEvent = {
      type: 'dispute.submitted',
      disputeId: dispute.disputeId,
      bookingId: dispute.bookingId,
      reporterUserId: dispute.reporterUserId,
      category: dispute.category,
      correlationId,
      occurredAt: dispute.createdAt,
    };

    logStructuredBreadcrumb({
      event: 'dispute.submitted.domain-event.emit',
      correlationId,
      status: 'succeeded',
      details: {
        disputeId: event.disputeId,
        bookingId: event.bookingId,
        reporterUserId: event.reporterUserId,
        category: event.category,
      },
    });

    logStructuredBreadcrumb({
      event: 'dispute.submit.write',
      correlationId,
      status: 'succeeded',
      details: {
        disputeId: dispute.disputeId,
        bookingId,
        replayed: false,
      },
    });

    return { ok: true, dispute };
  }

  async getPendingDisputes(
    session: AuthSession,
  ): Promise<{ ok: true; disputes: DisputeRecord[] } | { ok: false; statusCode: 403; error: string }> {
    if (session.role !== 'operator') {
      return { ok: false, statusCode: 403, error: 'Only operators can view pending disputes.' };
    }

    const [openDisputes, underReviewDisputes] = await Promise.all([
      this.disputes.findByStatus('open'),
      this.disputes.findByStatus('under-review'),
    ]);

    const disputes = [...openDisputes, ...underReviewDisputes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return { ok: true, disputes };
  }

  async startReviewDispute(
    session: AuthSession,
    disputeId: string,
    correlationId: string,
  ): Promise<{ ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 403 | 404 | 409; error: string }> {
    return this.transitionDispute(session, disputeId, 'startReview', null, correlationId);
  }

  async resolveDispute(
    session: AuthSession,
    disputeId: string,
    resolutionNote: string,
    correlationId: string,
  ): Promise<{ ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 400 | 403 | 404 | 409; error: string }> {
    const note = resolutionNote.trim();
    if (!note) {
      return { ok: false, statusCode: 400, error: 'resolutionNote is required to resolve a dispute.' };
    }

    return this.transitionDispute(session, disputeId, 'resolve', note, correlationId);
  }

  async closeDispute(
    session: AuthSession,
    disputeId: string,
    resolutionNote: string | undefined,
    correlationId: string,
  ): Promise<{ ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 403 | 404 | 409; error: string }> {
    const note = resolutionNote?.trim();
    return this.transitionDispute(session, disputeId, 'close', note && note.length > 0 ? note : null, correlationId);
  }

  private async transitionDispute(
    session: AuthSession,
    disputeId: string,
    action: DisputeOperatorActionType,
    resolutionNote: string | null,
    correlationId: string,
  ): Promise<{ ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 403 | 404 | 409; error: string }> {
    if (session.role !== 'operator') {
      return { ok: false, statusCode: 403, error: 'Only operators can transition disputes.' };
    }

    const targetStatus = disputeOperatorActionTransitions[action];

    const allowedCurrentStatuses = ['open', 'under-review', 'resolved', 'closed'].filter((status) =>
      canApplyDisputeOperatorAction(status as DisputeRecord['status'], action),
    ) as DisputeRecord['status'][];

    const transitionResult = await this.disputes.transitionStatus({
      disputeId,
      allowedCurrentStatuses,
      nextStatus: targetStatus,
      resolvedAt: action === 'startReview' ? undefined : new Date().toISOString(),
      resolutionNote: action === 'startReview' ? undefined : resolutionNote,
    });

    if (!transitionResult.ok) {
      if (transitionResult.reason === 'not-found') {
        return { ok: false, statusCode: 404, error: 'Dispute not found.' };
      }

      return {
        ok: false,
        statusCode: 409,
        error: `Dispute cannot transition from ${transitionResult.currentStatus} via ${action}.`,
      };
    }

    logStructuredBreadcrumb({
      event: 'dispute.operator.transition',
      correlationId,
      status: 'succeeded',
      details: {
        disputeId,
        action,
        actorUserId: session.userId,
        replayed: transitionResult.replayed,
        nextStatus: transitionResult.dispute.status,
      },
    });

    return { ok: true, dispute: transitionResult.dispute };
  }
}
