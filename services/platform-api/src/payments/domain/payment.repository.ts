import type { PaymentRecord } from '@quickwerk/domain';

export type CreatePaymentInput = {
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  amountCents: number;
  currency: string;
  capturedAt: string;
  correlationId: string;
};

export type CreatePaymentResult =
  | { ok: true; payment: PaymentRecord; replayed: boolean }
  | { ok: false; reason: 'duplicate-booking' };

export interface PaymentRepository {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
