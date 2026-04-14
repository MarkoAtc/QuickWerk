import {
  createGetBookingInvoiceRequest,
  createGetBookingReviewsRequest,
  createSubmitDisputeRequest,
  createSubmitReviewRequest,
} from '@quickwerk/api-client';
import type { DisputeCategory, DisputeRecord, InvoiceRecord, ReviewRecord } from '@quickwerk/domain';

import {
  loadBookingContinuation,
  type BookingContinuationPayment,
  type BookingContinuationRecord,
} from './active-job-screen-actions';
import { runtimeConfig } from '../../shared/runtime-config';

type LoadBookingCompletionInput = {
  sessionToken: string;
  bookingId: string;
};

export type LoadBookingCompletionResult =
  | {
    booking: BookingContinuationRecord;
    payment?: BookingContinuationPayment;
    invoice?: InvoiceRecord;
    reviews: ReviewRecord[];
    latestDispute?: DisputeRecord;
    warningMessages: string[];
    errorMessage?: undefined;
  }
  | {
    booking?: undefined;
    payment?: undefined;
    invoice?: undefined;
    reviews?: undefined;
    latestDispute?: undefined;
    warningMessages?: undefined;
    errorMessage: string;
  };

type SubmitBookingCompletionReviewInput = {
  sessionToken: string;
  bookingId: string;
  rating: number;
  comment?: string;
};

export type SubmitBookingCompletionReviewResult =
  | { review: ReviewRecord; errorMessage?: undefined }
  | { review?: undefined; errorMessage: string };

type SubmitBookingCompletionDisputeInput = {
  sessionToken: string;
  bookingId: string;
  category: DisputeCategory;
  description: string;
};

export type SubmitBookingCompletionDisputeResult =
  | { dispute: DisputeRecord; errorMessage?: undefined }
  | { dispute?: undefined; errorMessage: string };

const knownInvoiceStatuses = ['draft', 'issued', 'void'] as const;
const knownReviewStatuses = ['submitted', 'moderated', 'removed'] as const;
const knownDisputeStatuses = ['open', 'under-review', 'resolved', 'closed'] as const;
const knownDisputeCategories = ['no-show', 'quality', 'billing', 'safety', 'other'] as const;

function isKnownStatus<T extends string>(raw: unknown, values: readonly T[]): raw is T {
  return typeof raw === 'string' && (values as readonly string[]).includes(raw);
}

function parseInvoice(payload: unknown): InvoiceRecord | null {
  const invoice = payload as Record<string, unknown>;

  if (
    typeof invoice['invoiceId'] !== 'string'
    || typeof invoice['bookingId'] !== 'string'
    || typeof invoice['customerUserId'] !== 'string'
    || typeof invoice['providerUserId'] !== 'string'
    || !Array.isArray(invoice['lineItems'])
    || typeof invoice['subtotalCents'] !== 'number'
    || typeof invoice['taxCents'] !== 'number'
    || typeof invoice['totalCents'] !== 'number'
    || typeof invoice['currency'] !== 'string'
    || !isKnownStatus(invoice['status'], knownInvoiceStatuses)
    || (invoice['issuedAt'] != null && typeof invoice['issuedAt'] !== 'string')
    || typeof invoice['createdAt'] !== 'string'
    || (invoice['pdfUrl'] != null && typeof invoice['pdfUrl'] !== 'string')
  ) {
    return null;
  }

  // Validate all line items first - if any are invalid, reject the entire invoice
  const lineItems: InvoiceRecord['lineItems'] = [];

  for (const item of invoice['lineItems']) {
    const line = item as Record<string, unknown>;

    if (
      typeof line['description'] !== 'string'
      || typeof line['quantity'] !== 'number'
      || typeof line['unitAmountCents'] !== 'number'
      || typeof line['totalAmountCents'] !== 'number'
    ) {
      return null;
    }

    lineItems.push({
      description: line['description'],
      quantity: line['quantity'],
      unitAmountCents: line['unitAmountCents'],
      totalAmountCents: line['totalAmountCents'],
    });
  }

  if (lineItems.length === 0) {
    return null;
  }

  return {
    invoiceId: invoice['invoiceId'],
    bookingId: invoice['bookingId'],
    customerUserId: invoice['customerUserId'],
    providerUserId: invoice['providerUserId'],
    lineItems,
    subtotalCents: invoice['subtotalCents'],
    taxCents: invoice['taxCents'],
    totalCents: invoice['totalCents'],
    currency: invoice['currency'],
    status: invoice['status'],
    issuedAt: invoice['issuedAt'] ?? null,
    createdAt: invoice['createdAt'],
    pdfUrl: invoice['pdfUrl'] ?? null,
  };
}

function parseReview(payload: unknown): ReviewRecord | null {
  const review = payload as Record<string, unknown>;

  if (
    typeof review['reviewId'] !== 'string'
    || typeof review['bookingId'] !== 'string'
    || typeof review['customerUserId'] !== 'string'
    || typeof review['providerUserId'] !== 'string'
    || (review['authorRole'] !== 'customer' && review['authorRole'] !== 'provider')
    || ![1, 2, 3, 4, 5].includes(review['rating'] as number)
    || (review['comment'] != null && typeof review['comment'] !== 'string')
    || !isKnownStatus(review['status'], knownReviewStatuses)
    || typeof review['createdAt'] !== 'string'
  ) {
    return null;
  }

  return {
    reviewId: review['reviewId'],
    bookingId: review['bookingId'],
    customerUserId: review['customerUserId'],
    providerUserId: review['providerUserId'],
    authorRole: review['authorRole'],
    rating: review['rating'] as ReviewRecord['rating'],
    comment: review['comment'] ?? null,
    status: review['status'],
    createdAt: review['createdAt'],
  };
}

function parseDispute(payload: unknown): DisputeRecord | null {
  const dispute = payload as Record<string, unknown>;

  if (
    typeof dispute['disputeId'] !== 'string'
    || typeof dispute['bookingId'] !== 'string'
    || typeof dispute['reporterUserId'] !== 'string'
    || (dispute['reporterRole'] !== 'customer' && dispute['reporterRole'] !== 'provider')
    || !isKnownStatus(dispute['category'], knownDisputeCategories)
    || typeof dispute['description'] !== 'string'
    || !isKnownStatus(dispute['status'], knownDisputeStatuses)
    || typeof dispute['createdAt'] !== 'string'
    || (dispute['resolvedAt'] != null && typeof dispute['resolvedAt'] !== 'string')
    || (dispute['resolutionNote'] != null && typeof dispute['resolutionNote'] !== 'string')
  ) {
    return null;
  }

  return {
    disputeId: dispute['disputeId'],
    bookingId: dispute['bookingId'],
    reporterUserId: dispute['reporterUserId'],
    reporterRole: dispute['reporterRole'],
    category: dispute['category'],
    description: dispute['description'],
    status: dispute['status'],
    createdAt: dispute['createdAt'],
    resolvedAt: dispute['resolvedAt'] ?? null,
    resolutionNote: dispute['resolutionNote'] ?? null,
  };
}

export async function loadBookingCompletion(
  input: LoadBookingCompletionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadBookingCompletionResult> {
  const continuation = await loadBookingContinuation(
    { sessionToken: input.sessionToken, bookingId: input.bookingId },
    fetchImpl,
  );

  if (continuation.errorMessage) {
    return { errorMessage: continuation.errorMessage };
  }

  if (!continuation.booking) {
    return { errorMessage: 'Booking details are unavailable.' };
  }

  const warningMessages = continuation.warningMessage ? [continuation.warningMessage] : [];

  if (continuation.booking.status !== 'completed') {
    return {
      booking: continuation.booking,
      payment: continuation.payment,
      reviews: [],
      latestDispute: undefined,
      warningMessages,
    };
  }

  const invoiceRequest = createGetBookingInvoiceRequest(input.sessionToken, input.bookingId);
  let invoice: InvoiceRecord | undefined;

  try {
    const invoiceResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${invoiceRequest.path}`, {
      method: invoiceRequest.method,
      headers: invoiceRequest.headers,
    });

    if (invoiceResponse.ok) {
      const parsedInvoice = parseInvoice(await invoiceResponse.json());
      if (parsedInvoice) {
        invoice = parsedInvoice;
      } else {
        warningMessages.push('Invoice response missing required fields.');
      }
    } else if (invoiceResponse.status !== 403 && invoiceResponse.status !== 404) {
      warningMessages.push(`Invoice details unavailable (HTTP ${invoiceResponse.status}).`);
    }
  } catch (error) {
    warningMessages.push(error instanceof Error ? error.message : 'Unknown invoice fetch failure.');
  }

  const reviewsRequest = createGetBookingReviewsRequest(input.sessionToken, input.bookingId);
  let reviews: ReviewRecord[] = [];

  try {
    const reviewsResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${reviewsRequest.path}`, {
      method: reviewsRequest.method,
      headers: reviewsRequest.headers,
    });

    if (reviewsResponse.ok) {
      const payload = await reviewsResponse.json();
      if (!Array.isArray(payload)) {
        warningMessages.push('Reviews response format is invalid.');
      } else {
        reviews = payload
          .map((entry) => parseReview(entry))
          .filter((entry): entry is ReviewRecord => entry != null);

        if (payload.length > reviews.length) {
          warningMessages.push('Some reviews missing required fields.');
        }
      }
    } else if (reviewsResponse.status !== 403 && reviewsResponse.status !== 404) {
      warningMessages.push(`Review details unavailable (HTTP ${reviewsResponse.status}).`);
    }
  } catch (error) {
    warningMessages.push(error instanceof Error ? error.message : 'Unknown review fetch failure.');
  }

  let latestDispute: DisputeRecord | undefined;

  // TODO: Add GET endpoint for booking disputes - for now, latestDispute is not fetched
  // Once API endpoint is available, fetch dispute here using:
  // const disputeRequest = createGetBookingDisputeRequest(input.sessionToken, input.bookingId);
  // and parse the response using parseDispute()

  return {
    booking: continuation.booking,
    payment: continuation.payment,
    invoice,
    reviews,
    latestDispute,
    warningMessages,
  };
}

export async function submitBookingCompletionReview(
  input: SubmitBookingCompletionReviewInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitBookingCompletionReviewResult> {
  const request = createSubmitReviewRequest(input.sessionToken, input.bookingId, {
    rating: input.rating,
    comment: input.comment,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Failed to submit review with HTTP ${response.status}.` };
    }

    const review = parseReview(await response.json());

    if (!review) {
      return { errorMessage: 'Review response missing required fields.' };
    }

    return { review };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown review submission failure.',
    };
  }
}

export async function submitBookingCompletionDispute(
  input: SubmitBookingCompletionDisputeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitBookingCompletionDisputeResult> {
  const request = createSubmitDisputeRequest(input.sessionToken, input.bookingId, {
    category: input.category,
    description: input.description,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Failed to open dispute with HTTP ${response.status}.` };
    }

    const dispute = parseDispute(await response.json());

    if (!dispute) {
      return { errorMessage: 'Dispute response missing required fields.' };
    }

    return { dispute };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown dispute submission failure.',
    };
  }
}