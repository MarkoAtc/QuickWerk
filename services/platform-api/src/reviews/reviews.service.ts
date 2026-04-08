import { randomUUID } from 'node:crypto';

import { ReviewRecord, ReviewSubmittedDomainEvent } from '@quickwerk/domain';
import { Inject, Injectable } from '@nestjs/common';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BOOKING_REPOSITORY, BookingRepository } from '../bookings/domain/booking.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import { REVIEW_REPOSITORY, ReviewRepository } from './domain/review.repository';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
  ) {}

  async submitReview(
    session: AuthSession,
    bookingId: string,
    input: { rating: number; comment?: string },
    correlationId: string,
  ): Promise<
    | { ok: true; review: ReviewRecord }
    | { ok: false; statusCode: 400 | 403 | 404 | 409; error: string }
  > {
    if (session.role !== 'customer' && session.role !== 'provider') {
      return { ok: false, statusCode: 403, error: 'Only customers or providers can submit reviews.' };
    }

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return { ok: false, statusCode: 400, error: 'Rating must be an integer between 1 and 5.' };
    }

    const booking = await this.bookings.getBooking(bookingId);
    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    if (booking.status !== 'completed') {
      return { ok: false, statusCode: 409, error: 'Reviews can only be submitted after booking completion.' };
    }

    if (session.role === 'customer' && booking.customerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (session.role === 'provider' && booking.providerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (!booking.providerUserId) {
      return { ok: false, statusCode: 409, error: 'Booking has no provider assigned.' };
    }

    const authorRole = session.role === 'customer' ? 'customer' : 'provider';

    const existing = await this.reviews.findByBookingIdAndAuthor(bookingId, authorRole, session.userId);
    if (existing) {
      logStructuredBreadcrumb({
        event: 'review.submit.write',
        correlationId,
        status: 'succeeded',
        details: {
          bookingId,
          reviewId: existing.reviewId,
          replayed: true,
        },
      });

      return { ok: true, review: existing };
    }

    const review: ReviewRecord = {
      reviewId: randomUUID(),
      bookingId,
      customerUserId: booking.customerUserId,
      providerUserId: booking.providerUserId,
      authorRole,
      rating: input.rating as ReviewRecord['rating'],
      comment: input.comment?.trim() ? input.comment.trim() : null,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };

    await this.reviews.save(review);

    const event: ReviewSubmittedDomainEvent = {
      type: 'review.submitted',
      reviewId: review.reviewId,
      bookingId: review.bookingId,
      providerUserId: review.providerUserId,
      rating: review.rating,
      correlationId,
      occurredAt: review.createdAt,
    };

    logStructuredBreadcrumb({
      event: 'review.submitted.domain-event.emit',
      correlationId,
      status: 'succeeded',
      details: {
        reviewId: event.reviewId,
        bookingId: event.bookingId,
        providerUserId: event.providerUserId,
        rating: event.rating,
      },
    });

    logStructuredBreadcrumb({
      event: 'review.submit.write',
      correlationId,
      status: 'succeeded',
      details: {
        bookingId,
        reviewId: review.reviewId,
        replayed: false,
      },
    });

    return { ok: true, review };
  }

  async getBookingReviews(
    session: AuthSession,
    bookingId: string,
  ): Promise<{ ok: true; reviews: ReviewRecord[] } | { ok: false; statusCode: 403 | 404; error: string }> {
    const booking = await this.bookings.getBooking(bookingId);
    if (!booking) {
      return { ok: false, statusCode: 404, error: 'Booking not found.' };
    }

    if (session.role === 'customer' && booking.customerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    if (session.role === 'provider' && booking.providerUserId !== session.userId) {
      return { ok: false, statusCode: 403, error: 'You do not have access to this booking.' };
    }

    const reviews = await this.reviews.findByBookingId(bookingId);
    return { ok: true, reviews };
  }

  async getProviderReviews(providerUserId: string): Promise<{ ok: true; reviews: ReviewRecord[] }> {
    const reviews = await this.reviews.findByProviderUserId(providerUserId);
    return { ok: true, reviews };
  }
}
