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
}
