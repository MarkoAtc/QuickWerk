import { ReviewRecord } from '@quickwerk/domain';

export interface ReviewRepository {
  save(review: ReviewRecord): Promise<{ ok: boolean }>;
  findByBookingIdAndAuthor(
    bookingId: string,
    authorRole: ReviewRecord['authorRole'],
    authorUserId: string,
  ): Promise<ReviewRecord | null>;
  findByBookingId(bookingId: string): Promise<ReviewRecord[]>;
  findByProviderUserId(providerUserId: string): Promise<ReviewRecord[]>;
}

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');
