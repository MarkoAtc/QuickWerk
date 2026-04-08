import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryBookingRepository } from '../bookings/infrastructure/in-memory-booking.repository';
import { InMemoryReviewRepository } from './infrastructure/in-memory-review.repository';
import { ReviewsService } from './reviews.service';

const createSession = (role: AuthSession['role'], userId: string): AuthSession => {
  const createdAt = new Date();
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 1000 * 60 * 60).toISOString(),
    email: `${role}@quickwerk.local`,
    role,
    token: `${role}-token`,
    userId,
  };
};

const createService = () => {
  const bookings = new InMemoryBookingRepository();
  const reviews = new InMemoryReviewRepository();
  const service = new ReviewsService(reviews, bookings);
  return { service, bookings };
};

describe('ReviewsService', () => {
  it('submits and replays idempotently for the same author', async () => {
    const { service, bookings } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await bookings.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: customer.userId,
      requestedService: 'Plumbing',
      actorRole: 'customer',
      actorUserId: customer.userId,
    });

    await bookings.acceptSubmittedBooking({
      bookingId: created.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: provider.userId,
      actorRole: 'provider',
      actorUserId: provider.userId,
    });

    await bookings.completeAcceptedBooking({
      bookingId: created.bookingId,
      completedAt: new Date().toISOString(),
      providerUserId: provider.userId,
      actorRole: 'provider',
      actorUserId: provider.userId,
    });

    const first = await service.submitReview(
      customer,
      created.bookingId,
      { rating: 5, comment: 'Great work' },
      'corr-review-1',
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await service.submitReview(
      customer,
      created.bookingId,
      { rating: 5, comment: 'Great work' },
      'corr-review-2',
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.review.reviewId).toBe(first.review.reviewId);
  });

  it('returns 403 when provider does not belong to the booking', async () => {
    const { service, bookings } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');
    const anotherProvider = createSession('provider', 'provider-2');

    const created = await bookings.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: customer.userId,
      requestedService: 'Painting',
      actorRole: 'customer',
      actorUserId: customer.userId,
    });

    await bookings.acceptSubmittedBooking({
      bookingId: created.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: provider.userId,
      actorRole: 'provider',
      actorUserId: provider.userId,
    });

    await bookings.completeAcceptedBooking({
      bookingId: created.bookingId,
      completedAt: new Date().toISOString(),
      providerUserId: provider.userId,
      actorRole: 'provider',
      actorUserId: provider.userId,
    });

    const result = await service.submitReview(
      anotherProvider,
      created.bookingId,
      { rating: 4, comment: 'Not mine' },
      'corr-review-3',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });
});
