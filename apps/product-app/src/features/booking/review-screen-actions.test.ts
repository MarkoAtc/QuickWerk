import { describe, expect, it } from 'vitest';

import { loadBookingReviews, submitReview } from './review-screen-actions';

const mockFetch =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);

const makeReviewRecord = () => ({
  reviewId: 'review-1',
  bookingId: 'booking-1',
  customerUserId: 'customer-1',
  providerUserId: 'provider-1',
  authorRole: 'customer' as const,
  rating: 5 as const,
  comment: 'Great service!',
  status: 'submitted' as const,
  createdAt: '2026-04-01T12:00:00.000Z',
});

describe('submitReview', () => {
  it('returns submitted state with review on success', async () => {
    const review = makeReviewRecord();
    const fetch = mockFetch(200, review);
    const result = await submitReview('customer-token', 'booking-1', 5, 'Great service!', fetch);

    expect(result.status).toBe('submitted');
    if (result.status === 'submitted') {
      expect(result.review.reviewId).toBe('review-1');
      expect(result.review.rating).toBe(5);
    }
  });

  it('returns submitted state without comment', async () => {
    const review = makeReviewRecord();
    const fetch = mockFetch(201, review);
    const result = await submitReview('customer-token', 'booking-1', 4, undefined, fetch);

    expect(result.status).toBe('submitted');
  });

  it('returns error state on non-OK response', async () => {
    const fetch = mockFetch(400, { message: 'Bad Request' });
    const result = await submitReview('customer-token', 'booking-1', 5, undefined, fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('400');
    }
  });

  it('returns error state on 401 response', async () => {
    const fetch = mockFetch(401, { message: 'Unauthorized' });
    const result = await submitReview('expired-token', 'booking-1', 5, undefined, fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('401');
    }
  });

  it('returns error state when fetch throws', async () => {
    const fetch = () => Promise.reject(new Error('Network failure'));
    const result = await submitReview(
      'customer-token',
      'booking-1',
      5,
      undefined,
      fetch as typeof globalThis.fetch,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('Network failure');
    }
  });
});

describe('loadBookingReviews', () => {
  it('returns loaded state with reviews on success', async () => {
    const reviews = [makeReviewRecord()];
    const fetch = mockFetch(200, reviews);
    const result = await loadBookingReviews('customer-token', 'booking-1', fetch);

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].reviewId).toBe('review-1');
    }
  });

  it('returns loaded state with empty array when no reviews', async () => {
    const fetch = mockFetch(200, []);
    const result = await loadBookingReviews('customer-token', 'booking-1', fetch);

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.reviews).toHaveLength(0);
    }
  });

  it('returns error state on non-OK response', async () => {
    const fetch = mockFetch(403, { message: 'Forbidden' });
    const result = await loadBookingReviews('customer-token', 'booking-1', fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('403');
    }
  });

  it('returns error state on 401 response', async () => {
    const fetch = mockFetch(401, { message: 'Unauthorized' });
    const result = await loadBookingReviews('expired-token', 'booking-1', fetch);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('401');
    }
  });

  it('returns error state when fetch throws', async () => {
    const fetch = () => Promise.reject(new Error('Network failure'));
    const result = await loadBookingReviews(
      'customer-token',
      'booking-1',
      fetch as typeof globalThis.fetch,
    );

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('Network failure');
    }
  });
});
