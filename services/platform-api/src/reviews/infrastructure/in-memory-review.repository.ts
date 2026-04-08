import { Injectable } from '@nestjs/common';

import { ReviewRecord } from '@quickwerk/domain';

import { ReviewRepository } from '../domain/review.repository';

@Injectable()
export class InMemoryReviewRepository implements ReviewRepository {
  private readonly reviews = new Map<string, ReviewRecord>();

  async save(review: ReviewRecord): Promise<{ ok: boolean }> {
    this.reviews.set(review.reviewId, review);
    return { ok: true };
  }

  async findByBookingIdAndAuthor(
    bookingId: string,
    authorRole: ReviewRecord['authorRole'],
    authorUserId: string,
  ): Promise<ReviewRecord | null> {
    const found = Array.from(this.reviews.values()).find(
      (review) => {
        const reviewAuthorUserId = review.authorRole === 'customer' ? review.customerUserId : review.providerUserId;
        return review.bookingId === bookingId && review.authorRole === authorRole && reviewAuthorUserId === authorUserId;
      },
    );
    return found ?? null;
  }

  async findByBookingId(bookingId: string): Promise<ReviewRecord[]> {
    return Array.from(this.reviews.values()).filter((review) => review.bookingId === bookingId);
  }

  async findByProviderUserId(providerUserId: string): Promise<ReviewRecord[]> {
    return Array.from(this.reviews.values()).filter((review) => review.providerUserId === providerUserId);
  }
}
