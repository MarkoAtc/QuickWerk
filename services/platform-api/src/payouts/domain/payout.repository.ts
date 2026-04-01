import type { PayoutRecord } from '@quickwerk/domain';

export type CreatePayoutInput = {
  providerUserId: string;
  bookingId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  createdAt: string;
};

export interface PayoutRepository {
  createPayout(input: CreatePayoutInput): Promise<PayoutRecord>;
  findPayoutById(payoutId: string): Promise<PayoutRecord | null>;
  findPayoutsByProviderUserId(providerUserId: string): Promise<PayoutRecord[]>;
  findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null>;
}

export const PAYOUT_REPOSITORY = Symbol('PAYOUT_REPOSITORY');
