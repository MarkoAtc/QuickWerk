import { describe, expect, it, vi } from 'vitest';

import { loadBookingReviews, loadReviewScreenData, submitReview } from './review-screen-actions';

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

  it('sends the bearer token, JSON content type, and existing review body contract', async () => {
    const fetch = vi.fn(mockFetch(201, makeReviewRecord()));

    await submitReview('customer-token', 'booking-1', 4, 'Highlights: Punctual', fetch);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/bookings/booking-1/reviews'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer customer-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ rating: 4, comment: 'Highlights: Punctual' }),
      }),
    );
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

describe('loadReviewScreenData', () => {
  const completedBooking = {
    bookingId: 'booking-1',
    requestedService: 'Electrical installation',
    status: 'completed',
    providerUserId: 'provider-1',
  };

  const provider = {
    providerUserId: 'provider-1',
    displayName: 'Marcus Weber',
    photoUrl: 'https://example.test/marcus.jpg',
  };

  it('loads authenticated booking/reviews and optional public provider context', async () => {
    const fetchImpl: typeof globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/v1/bookings/booking-1')) {
        return Promise.resolve(mockFetch(200, completedBooking)(input, init));
      }
      if (url.endsWith('/api/v1/bookings/booking-1/reviews')) {
        return Promise.resolve(mockFetch(200, [makeReviewRecord()])(input, init));
      }
      if (url.endsWith('/api/v1/providers/provider-1')) {
        return Promise.resolve(mockFetch(200, provider)(input, init));
      }

      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof globalThis.fetch;

    const result = await loadReviewScreenData('customer-token', 'booking-1', fetchImpl);

    expect(result).toEqual({
      status: 'loaded',
      booking: completedBooking,
      provider,
      reviews: [makeReviewRecord()],
    });

    const calls = vi.mocked(fetchImpl).mock.calls;
    const bookingCall = calls.find(([url]) => String(url).endsWith('/api/v1/bookings/booking-1'));
    const reviewsCall = calls.find(([url]) => String(url).endsWith('/api/v1/bookings/booking-1/reviews'));
    expect(bookingCall?.[1]?.headers).toEqual({ authorization: 'Bearer customer-token' });
    expect(reviewsCall?.[1]?.headers).toEqual({ authorization: 'Bearer customer-token' });
  });

  it('rejects a booking that is not completed before loading review data', async () => {
    const fetch = vi.fn(mockFetch(200, { ...completedBooking, status: 'accepted' }));

    const result = await loadReviewScreenData('customer-token', 'booking-1', fetch);

    expect(result).toEqual({
      status: 'error',
      message: 'Reviews are available after the booking is completed.',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns an error for malformed required booking or review payloads', async () => {
    const malformedBooking = await loadReviewScreenData(
      'customer-token',
      'booking-1',
      mockFetch(200, { bookingId: 'booking-1', status: 'completed' }),
    );
    expect(malformedBooking).toEqual({ status: 'error', message: 'Booking response missing required review fields.' });

    const fetchImpl: typeof globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/bookings/booking-1')) {
        return Promise.resolve(mockFetch(200, completedBooking)(input, init));
      }
      if (url.endsWith('/reviews')) {
        return Promise.resolve(mockFetch(200, [{ reviewId: 'incomplete' }])(input, init));
      }
      return Promise.resolve(mockFetch(404, {})(input, init));
    }) as unknown as typeof globalThis.fetch;

    const malformedReviews = await loadReviewScreenData('customer-token', 'booking-1', fetchImpl);
    expect(malformedReviews).toEqual({ status: 'error', message: 'Reviews response missing required fields.' });
  });

  it('uses a safe provider fallback when the public profile is unavailable', async () => {
    const fetchImpl: typeof globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/bookings/booking-1')) {
        return Promise.resolve(mockFetch(200, completedBooking)(input, init));
      }
      if (url.endsWith('/reviews')) {
        return Promise.resolve(mockFetch(200, [])(input, init));
      }
      return Promise.resolve(mockFetch(404, {})(input, init));
    }) as unknown as typeof globalThis.fetch;

    const result = await loadReviewScreenData('customer-token', 'booking-1', fetchImpl);

    expect(result).toEqual({
      status: 'loaded',
      booking: completedBooking,
      provider: undefined,
      reviews: [],
    });
  });
});
