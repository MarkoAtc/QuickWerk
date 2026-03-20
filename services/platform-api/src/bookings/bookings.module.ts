import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  BOOKING_DOMAIN_EVENT_PUBLISHER,
} from '../orchestration/domain-event.publisher';
import { LoggingBookingDomainEventPublisher } from '../orchestration/logging-domain-event.publisher';
import {
  BOOKING_ACCEPTED_RELAY_CLOCK,
  SystemBookingAcceptedRelayClock,
} from '../orchestration/relay-clock';
import { RelayBookingDomainEventPublisher } from '../orchestration/relay-domain-event.publisher';
import {
  BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY,
  NoopBookingAcceptedRelayAttemptPolicy,
} from '../orchestration/relay-attempt-policy';
import {
  BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR,
  InMemoryRelayAttemptExecutor,
  PostgresRelayAttemptExecutor,
} from '../orchestration/relay-attempt-executor';
import { resolveRelayAttemptExecutor } from '../orchestration/relay-attempt-executor.provider';
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
    NoopBookingAcceptedRelayAttemptPolicy,
    SystemBookingAcceptedRelayClock,
    InMemoryRelayAttemptExecutor,
    PostgresRelayAttemptExecutor,
    RelayBookingDomainEventPublisher,
    {
      provide: BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY,
      useExisting: NoopBookingAcceptedRelayAttemptPolicy,
    },
    {
      provide: BOOKING_ACCEPTED_RELAY_CLOCK,
      useExisting: SystemBookingAcceptedRelayClock,
    },
    {
      provide: BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR,
      inject: [InMemoryRelayAttemptExecutor, PostgresRelayAttemptExecutor],
      useFactory: (
        inMemoryExecutor: InMemoryRelayAttemptExecutor,
        postgresPersistentExecutor: PostgresRelayAttemptExecutor,
      ) =>
        resolveRelayAttemptExecutor({
          inMemoryExecutor,
          postgresPersistentExecutor,
        }),
    },
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
