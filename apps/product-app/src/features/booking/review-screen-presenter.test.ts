import { describe, expect, it } from 'vitest';

import {
  composeReviewComment,
  findExistingReview,
  getReviewRatingLabel,
  toggleReviewHighlight,
} from './review-screen-presenter';

describe('review screen presenter', () => {
  it('maps every supported rating to the approved label', () => {
    expect([1, 2, 3, 4, 5].map(getReviewRatingLabel)).toEqual([
      'Poor',
      'Fair',
      'Good',
      'Very Good',
      'Excellent',
    ]);
  });

  it('toggles highlights without mutating the prior selection', () => {
    const selected = ['Professional'] as const;

    expect(toggleReviewHighlight([...selected], 'Punctual')).toEqual(['Professional', 'Punctual']);
    expect(toggleReviewHighlight([...selected, 'Punctual'], 'Professional')).toEqual(['Punctual']);
    expect(selected).toEqual(['Professional']);
  });

  it('composes selected highlights and narrative into the existing comment contract', () => {
    expect(composeReviewComment(['Professional', 'Punctual'], '  Great work.  ')).toBe(
      'Highlights: Professional, Punctual\n\nGreat work.',
    );
    expect(composeReviewComment(['Great Value'], '   ')).toBe('Highlights: Great Value');
    expect(composeReviewComment([], '  Great work.  ')).toBe('Great work.');
    expect(composeReviewComment([], '   ')).toBeUndefined();
  });

  it('finds the existing review authored by the current role', () => {
    const reviews = [
      {
        reviewId: 'provider-review',
        bookingId: 'booking-1',
        customerUserId: 'customer-1',
        providerUserId: 'provider-1',
        authorRole: 'provider' as const,
        rating: 4 as const,
        comment: null,
        status: 'submitted' as const,
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        reviewId: 'customer-review',
        bookingId: 'booking-1',
        customerUserId: 'customer-1',
        providerUserId: 'provider-1',
        authorRole: 'customer' as const,
        rating: 5 as const,
        comment: 'Excellent.',
        status: 'submitted' as const,
        createdAt: '2026-08-01T10:01:00.000Z',
      },
    ];

    expect(findExistingReview(reviews, 'customer')?.reviewId).toBe('customer-review');
    expect(findExistingReview(reviews, 'provider')?.reviewId).toBe('provider-review');
  });
});
