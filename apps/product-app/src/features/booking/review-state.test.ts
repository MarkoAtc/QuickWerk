import { describe, expect, it } from 'vitest';

import type { ReviewRecord } from '@quickwerk/domain';

import { initialReviewLoadState, initialReviewSubmitState } from './review-state';
import type { ReviewLoadState, ReviewSubmitState } from './review-state';

const makeReviewRecord = (overrides: Partial<ReviewRecord> = {}): ReviewRecord => ({
  reviewId: 'review-1',
  bookingId: 'booking-1',
  customerUserId: 'customer-1',
  providerUserId: 'provider-1',
  authorRole: 'customer',
  rating: 5,
  comment: 'Great service!',
  status: 'submitted',
  createdAt: '2026-04-01T12:00:00.000Z',
  ...overrides,
});

describe('ReviewSubmitState', () => {
  it('initialReviewSubmitState has idle status', () => {
    expect(initialReviewSubmitState.status).toBe('idle');
  });

  it('submitted state contains a review record', () => {
    const state: ReviewSubmitState = { status: 'submitted', review: makeReviewRecord() };

    expect(state.status).toBe('submitted');
    if (state.status === 'submitted') {
      expect(state.review.reviewId).toBe('review-1');
      expect(state.review.rating).toBe(5);
      expect(state.review.authorRole).toBe('customer');
    }
  });

  it('submitting state has correct status', () => {
    const state: ReviewSubmitState = { status: 'submitting' };
    expect(state.status).toBe('submitting');
  });

  it('error state contains a message', () => {
    const state: ReviewSubmitState = { status: 'error', message: 'Network failure' };

    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.message).toBe('Network failure');
    }
  });
});

describe('ReviewLoadState', () => {
  it('initialReviewLoadState has idle status', () => {
    expect(initialReviewLoadState.status).toBe('idle');
  });

  it('loaded state contains review records', () => {
    const state: ReviewLoadState = { status: 'loaded', reviews: [makeReviewRecord()] };

    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.reviews).toHaveLength(1);
      expect(state.reviews[0].reviewId).toBe('review-1');
      expect(state.reviews[0].rating).toBe(5);
    }
  });

  it('loading state has correct status', () => {
    const state: ReviewLoadState = { status: 'loading' };
    expect(state.status).toBe('loading');
  });

  it('error state contains a message', () => {
    const state: ReviewLoadState = { status: 'error', message: 'Network failure' };

    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.message).toBe('Network failure');
    }
  });

  it('loaded state with empty reviews array is valid', () => {
    const state: ReviewLoadState = { status: 'loaded', reviews: [] };
    expect(state.status).toBe('loaded');
    if (state.status === 'loaded') {
      expect(state.reviews).toHaveLength(0);
    }
  });
});
