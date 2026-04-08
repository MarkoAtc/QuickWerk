import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { DisputeRecord, DisputeSubmittedDomainEvent } from '@quickwerk/domain';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { DISPUTE_REPOSITORY, DisputeRepository } from './domain/dispute.repository';

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DISPUTE_REPOSITORY)
    private readonly disputes: DisputeRepository,
  ) {}

  async submitDispute(
    session: AuthSession,
    bookingId: string,
    category: string,
    description: string,
    correlationId: string,
  ): Promise<{ ok: true; dispute: DisputeRecord } | { ok: false; statusCode: 401 | 403; error: string }> {
    if (session.role !== 'customer' && session.role !== 'provider') {
      return { ok: false, statusCode: 403, error: 'Only customers or providers can submit disputes.' };
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
      category: category as DisputeRecord['category'],
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionNote: null,
    };

    await this.disputes.save(dispute);

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

    const disputes = await this.disputes.findByStatus('open');
    return { ok: true, disputes };
  }
}
