import {
  createGetBookingRequest,
  createGetBookingReviewsRequest,
  createGetPublicProviderRequest,
  createSubmitReviewRequest,
} from '@quickwerk/api-client';
import type { ReviewRecord } from '@quickwerk/domain';

import { runtimeConfig } from '../../shared/runtime-config';
import type { ReviewLoadState, ReviewSubmitState } from './review-state';

export type ReviewScreenBooking = {
  bookingId: string;
  requestedService: string;
  status: 'completed';
  providerUserId?: string;
};

export type ReviewScreenProvider = {
  providerUserId: string;
  displayName: string;
  photoUrl?: string;
};

export type LoadReviewScreenDataResult =
  | {
    status: 'loaded';
    booking: ReviewScreenBooking;
    provider: ReviewScreenProvider | undefined;
    reviews: ReviewRecord[];
  }
  | { status: 'error'; message: string };

const reviewStatuses = ['submitted', 'moderated', 'removed'] as const;

type ParsedReviewScreenBooking = Omit<ReviewScreenBooking, 'status'> & {
  status: string;
};

function parseReview(payload: unknown): ReviewRecord | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const review = payload as Record<string, unknown>;
  const rating = review['rating'];
  const status = review['status'];

  if (
    typeof review['reviewId'] !== 'string'
    || typeof review['bookingId'] !== 'string'
    || typeof review['customerUserId'] !== 'string'
    || typeof review['providerUserId'] !== 'string'
    || (review['authorRole'] !== 'customer' && review['authorRole'] !== 'provider')
    || typeof rating !== 'number'
    || !Number.isInteger(rating)
    || rating < 1
    || rating > 5
    || (review['comment'] !== null && typeof review['comment'] !== 'string')
    || typeof status !== 'string'
    || !(reviewStatuses as readonly string[]).includes(status)
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
    rating: rating as ReviewRecord['rating'],
    comment: review['comment'],
    status: status as ReviewRecord['status'],
    createdAt: review['createdAt'],
  };
}

function parseReviewScreenBooking(payload: unknown): ParsedReviewScreenBooking | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const booking = payload as Record<string, unknown>;

  if (
    typeof booking['bookingId'] !== 'string'
    || typeof booking['requestedService'] !== 'string'
    || typeof booking['status'] !== 'string'
  ) {
    return null;
  }

  return {
    bookingId: booking['bookingId'],
    requestedService: booking['requestedService'],
    status: booking['status'],
    providerUserId: typeof booking['providerUserId'] === 'string' ? booking['providerUserId'] : undefined,
  };
}

function parseReviewScreenProvider(payload: unknown): ReviewScreenProvider | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const provider = payload as Record<string, unknown>;

  if (
    typeof provider['providerUserId'] !== 'string'
    || typeof provider['displayName'] !== 'string'
  ) {
    return null;
  }

  return {
    providerUserId: provider['providerUserId'],
    displayName: provider['displayName'],
    photoUrl: typeof provider['photoUrl'] === 'string' ? provider['photoUrl'] : undefined,
  };
}

async function loadOptionalPublicProvider(
  providerUserId: string | undefined,
  fetchImpl: typeof fetch,
): Promise<ReviewScreenProvider | undefined> {
  if (!providerUserId) {
    return undefined;
  }

  const request = createGetPublicProviderRequest(providerUserId);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
    });

    if (!response.ok) {
      return undefined;
    }

    return parseReviewScreenProvider(await response.json()) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function loadReviewScreenData(
  sessionToken: string,
  bookingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadReviewScreenDataResult> {
  const bookingRequest = createGetBookingRequest(sessionToken, bookingId);

  try {
    const bookingResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${bookingRequest.path}`, {
      method: bookingRequest.method,
      headers: bookingRequest.headers,
    });

    if (!bookingResponse.ok) {
      return { status: 'error', message: `Failed to load booking: HTTP ${bookingResponse.status}.` };
    }

    const booking = parseReviewScreenBooking(await bookingResponse.json());
    if (!booking) {
      return { status: 'error', message: 'Booking response missing required review fields.' };
    }

    if (booking.status !== 'completed') {
      return { status: 'error', message: 'Reviews are available after the booking is completed.' };
    }

    const reviewsRequest = createGetBookingReviewsRequest(sessionToken, bookingId);
    const [reviewsResponse, provider] = await Promise.all([
      fetchImpl(`${runtimeConfig.platformApiBaseUrl}${reviewsRequest.path}`, {
        method: reviewsRequest.method,
        headers: reviewsRequest.headers,
      }),
      loadOptionalPublicProvider(booking.providerUserId, fetchImpl),
    ]);

    if (!reviewsResponse.ok) {
      return { status: 'error', message: `Failed to load reviews: HTTP ${reviewsResponse.status}.` };
    }

    const reviewsPayload = await reviewsResponse.json();
    if (!Array.isArray(reviewsPayload)) {
      return { status: 'error', message: 'Reviews response missing required fields.' };
    }

    const reviews = reviewsPayload.map(parseReview);
    if (reviews.some((review) => review === null)) {
      return { status: 'error', message: 'Reviews response missing required fields.' };
    }

    const completedBooking: ReviewScreenBooking = {
      ...booking,
      status: 'completed',
    };

    return {
      status: 'loaded',
      booking: completedBooking,
      provider,
      reviews: reviews as ReviewRecord[],
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown review screen loading error.',
    };
  }
}

export async function submitReview(
  sessionToken: string,
  bookingId: string,
  rating: number,
  comment?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewSubmitState> {
  const request = createSubmitReviewRequest(sessionToken, bookingId, { rating, comment });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { status: 'error', message: `Failed to submit review: HTTP ${response.status}.` };
    }

    const review = (await response.json()) as ReviewRecord;

    return { status: 'submitted', review };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error submitting review.',
    };
  }
}

export async function loadBookingReviews(
  sessionToken: string,
  bookingId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewLoadState> {
  const request = createGetBookingReviewsRequest(sessionToken, bookingId);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { status: 'error', message: `Failed to load reviews: HTTP ${response.status}.` };
    }

    const reviews = (await response.json()) as ReviewRecord[];

    return { status: 'loaded', reviews };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error loading reviews.',
    };
  }
}
