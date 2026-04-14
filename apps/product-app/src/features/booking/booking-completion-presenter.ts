import type { DisputeRecord, InvoiceRecord, ReviewRecord } from '@quickwerk/domain';

import type { BookingContinuationPayment, BookingContinuationRecord } from './active-job-screen-actions';

export type BookingCompletionViewModel = {
  bookingId: string;
  headline: string;
  subheadline: string;
  requestedService: string;
  paymentSummary: string;
  invoiceSummary: string;
  invoiceDetail: string;
  reviewSummary: string;
  latestReviewDetail: string;
  latestDisputeSummary: string;
  statusHistory: string[];
  warningMessages: string[];
};

type PresentBookingCompletionInput = {
  booking: BookingContinuationRecord;
  payment?: BookingContinuationPayment;
  invoice?: InvoiceRecord;
  reviews: ReviewRecord[];
  latestDispute?: DisputeRecord;
  warningMessages: string[];
};

function formatMoney(amountCents: number, currency: string): string {
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

function resolvePaymentSummary(payment?: BookingContinuationPayment): string {
  if (!payment) {
    return 'Payment details are not available yet.';
  }

  return `Payment ${payment.status}: ${formatMoney(payment.amountCents, payment.currency)}`;
}

function resolveInvoiceSummary(invoice?: InvoiceRecord): string {
  if (!invoice) {
    return 'Invoice details are not available yet.';
  }

  return `Invoice ${invoice.status}: ${formatMoney(invoice.totalCents, invoice.currency)}`;
}

function resolveInvoiceDetail(invoice?: InvoiceRecord): string {
  if (!invoice) {
    return 'Invoice has not been issued yet.';
  }

  const issuedText = invoice.issuedAt ? `Issued at ${invoice.issuedAt}` : 'Issue date pending';
  return `${invoice.lineItems.length} line item(s). ${issuedText}.`;
}

function resolveReviewSummary(reviews: ReviewRecord[]): string {
  if (reviews.length === 0) {
    return 'No reviews submitted yet.';
  }

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return `${reviews.length} review(s) • Avg ${average.toFixed(1)}/5`;
}

function resolveLatestReviewDetail(reviews: ReviewRecord[]): string {
  if (reviews.length === 0) {
    return 'Submit a review to record service quality feedback.';
  }

  const latest = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return `Latest review ${latest.rating}/5${latest.comment ? `: ${latest.comment}` : ''}`;
}

function resolveLatestDisputeSummary(dispute?: DisputeRecord): string {
  if (!dispute) {
    return 'No dispute has been opened for this booking.';
  }

  return `Latest dispute ${dispute.status} (${dispute.category})`; 
}

function resolveStatusHistory(booking: BookingContinuationRecord): string[] {
  return booking.statusHistory.map((event) => `${event.to} at ${event.changedAt}`);
}

export function presentBookingCompletion(input: PresentBookingCompletionInput): BookingCompletionViewModel {
  return {
    bookingId: input.booking.bookingId,
    headline: 'Booking completed',
    subheadline: 'Payment, invoice, and post-job actions are now available.',
    requestedService: input.booking.requestedService,
    paymentSummary: resolvePaymentSummary(input.payment),
    invoiceSummary: resolveInvoiceSummary(input.invoice),
    invoiceDetail: resolveInvoiceDetail(input.invoice),
    reviewSummary: resolveReviewSummary(input.reviews),
    latestReviewDetail: resolveLatestReviewDetail(input.reviews),
    latestDisputeSummary: resolveLatestDisputeSummary(input.latestDispute),
    statusHistory: resolveStatusHistory(input.booking),
    warningMessages: input.warningMessages,
  };
}
