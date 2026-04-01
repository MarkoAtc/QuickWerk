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

/**
 * Result of creating a payment record.
 * - `{ ok: true, replayed: true }` indicates the payment already exists and was returned idempotently
 * - `{ ok: true, replayed: false }` indicates a new payment was created
 * - `{ ok: false, reason: 'duplicate-booking' }` indicates a payment for this booking already exists
 *   but was created by a different request (not idempotent). This branch is reserved for future use
 *   when concurrent payment attempts from different sources need to be rejected.
 */
export type CreatePaymentResult =
  | { ok: true; payment: PaymentRecord; replayed: boolean }
  | { ok: false; reason: 'duplicate-booking' };

export interface PaymentRepository {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');