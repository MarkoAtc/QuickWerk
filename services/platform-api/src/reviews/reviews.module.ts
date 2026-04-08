import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { InMemoryReviewRepository } from './infrastructure/in-memory-review.repository';
import { reviewRepositoryProvider } from './infrastructure/review-repository.provider';
import { BookingReviewsController, ProviderReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [BookingReviewsController, ProviderReviewsController],
  providers: [ReviewsService, InMemoryReviewRepository, reviewRepositoryProvider],
  exports: [ReviewsService],
})
export class ReviewsModule {}
