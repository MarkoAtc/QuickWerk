import { createGetBookingReviewsRequest, createSubmitReviewRequest } from '@quickwerk/api-client';
import type { ReviewRecord } from '@quickwerk/domain';

import { runtimeConfig } from '../../shared/runtime-config';
import type { ReviewLoadState, ReviewSubmitState } from './review-state';

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
