import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BOOKING_REPOSITORY } from './domain/booking.repository';
import { InMemoryBookingRepository } from './infrastructure/in-memory-booking.repository';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuthModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    InMemoryBookingRepository,
    {
      provide: BOOKING_REPOSITORY,
      useExisting: InMemoryBookingRepository,
    },
  ],
})
export class BookingsModule {}
