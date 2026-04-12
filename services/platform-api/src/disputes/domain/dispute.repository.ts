import type { DisputeRecord, DisputeStatus } from '@quickwerk/domain';

export type CreateDisputeInput = {
  bookingId: string;
  reporterUserId: string;
  reporterRole: 'customer' | 'provider';
  category: string;
  description: string;
  createdAt: string;
};

export interface DisputeRepository {
  save(dispute: DisputeRecord): Promise<{ ok: boolean }>;
  findById(disputeId: string): Promise<DisputeRecord | null>;
  findByBookingIdAndReporter(bookingId: string, reporterUserId: string): Promise<DisputeRecord | null>;
  findByReporterUserId(reporterUserId: string): Promise<DisputeRecord[]>;
  findByStatus(status: DisputeStatus): Promise<DisputeRecord[]>;
  findByStatuses(statuses: DisputeStatus[]): Promise<DisputeRecord[]>;
  transitionStatus(input: {
    disputeId: string;
    allowedCurrentStatuses: DisputeStatus[];
    nextStatus: DisputeStatus;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
  }): Promise<
    | { ok: true; dispute: DisputeRecord; replayed: boolean }
    | { ok: false; reason: 'not-found' }
    | { ok: false; reason: 'transition-conflict'; currentStatus: DisputeStatus }
  >;
}

export const DISPUTE_REPOSITORY = Symbol('DISPUTE_REPOSITORY');
