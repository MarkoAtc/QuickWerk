import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  BOOKING_DOMAIN_EVENT_PUBLISHER,
} from '../orchestration/domain-event.publisher';
import { LoggingBookingDomainEventPublisher } from '../orchestration/logging-domain-event.publisher';
import { RelayBookingDomainEventPublisher } from '../orchestration/relay-domain-event.publisher';
import { PostgresClient } from '../persistence/postgres-client';
import { BOOKING_REPOSITORY } from './domain/booking.repository';
import { resolveBookingRepository } from './infrastructure/booking-repository.provider';
import { InMemoryBookingRepository } from './infrastructure/in-memory-booking.repository';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AuthModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    InMemoryBookingRepository,
    LoggingBookingDomainEventPublisher,
    RelayBookingDomainEventPublisher,
    {
      provide: BOOKING_REPOSITORY,
      inject: [InMemoryBookingRepository, PostgresClient],
      useFactory: (inMemoryRepository: InMemoryBookingRepository, postgresClient: PostgresClient) =>
        resolveBookingRepository({
          inMemoryRepository,
          postgresClient,
        }),
    },
    {
      provide: BOOKING_DOMAIN_EVENT_PUBLISHER,
      useExisting: RelayBookingDomainEventPublisher,
    },
  ],
})
export class BookingsModule {}
