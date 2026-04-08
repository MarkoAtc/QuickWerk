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
  findByBookingIdAndReporter(bookingId: string, reporterUserId: string): Promise<DisputeRecord | null>;
  findByReporterUserId(reporterUserId: string): Promise<DisputeRecord[]>;
  findByStatus(status: DisputeStatus): Promise<DisputeRecord[]>;
}

export const DISPUTE_REPOSITORY = Symbol('DISPUTE_REPOSITORY');
