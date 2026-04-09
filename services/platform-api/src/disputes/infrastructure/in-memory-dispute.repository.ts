import { Injectable } from '@nestjs/common';

import type { DisputeRecord, DisputeStatus } from '@quickwerk/domain';

import { DisputeRepository } from '../domain/dispute.repository';

@Injectable()
export class InMemoryDisputeRepository implements DisputeRepository {
  private readonly disputes = new Map<string, DisputeRecord>();

  async save(dispute: DisputeRecord): Promise<{ ok: boolean }> {
    this.disputes.set(dispute.disputeId, dispute);
    return { ok: true };
  }

  async findById(disputeId: string): Promise<DisputeRecord | null> {
    return this.disputes.get(disputeId) ?? null;
  }

  async findByBookingIdAndReporter(bookingId: string, reporterUserId: string): Promise<DisputeRecord | null> {
    const found = Array.from(this.disputes.values()).find(
      (d) => d.bookingId === bookingId && d.reporterUserId === reporterUserId,
    );
    return found ?? null;
  }

  async findByReporterUserId(reporterUserId: string): Promise<DisputeRecord[]> {
    return Array.from(this.disputes.values()).filter((d) => d.reporterUserId === reporterUserId);
  }

  async findByStatus(status: DisputeStatus): Promise<DisputeRecord[]> {
    return Array.from(this.disputes.values()).filter((d) => d.status === status);
  }

  async findByStatuses(statuses: DisputeStatus[]): Promise<DisputeRecord[]> {
    const allowed = new Set(statuses);
    return Array.from(this.disputes.values()).filter((d) => allowed.has(d.status));
  }

  async transitionStatus(input: {
    disputeId: string;
    allowedCurrentStatuses: DisputeStatus[];
    nextStatus: DisputeStatus;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
  }): Promise<
    | { ok: true; dispute: DisputeRecord; replayed: boolean }
    | { ok: false; reason: 'not-found' }
    | { ok: false; reason: 'transition-conflict'; currentStatus: DisputeStatus }
  > {
    const current = this.disputes.get(input.disputeId);
    if (!current) {
      return { ok: false, reason: 'not-found' };
    }

    if (current.status === input.nextStatus) {
      return { ok: true, dispute: current, replayed: true };
    }

    if (!input.allowedCurrentStatuses.includes(current.status)) {
      return { ok: false, reason: 'transition-conflict', currentStatus: current.status };
    }

    const updated: DisputeRecord = {
      ...current,
      status: input.nextStatus,
      resolvedAt: input.resolvedAt === undefined ? current.resolvedAt : input.resolvedAt,
      resolutionNote: input.resolutionNote === undefined ? current.resolutionNote : input.resolutionNote,
    };

    this.disputes.set(updated.disputeId, updated);
    return { ok: true, dispute: updated, replayed: false };
  }
}
