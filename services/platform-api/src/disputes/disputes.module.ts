import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PostgresClient } from '../persistence/postgres-client';
import { DISPUTE_REPOSITORY } from './domain/dispute.repository';
import { InMemoryDisputeRepository } from './infrastructure/in-memory-dispute.repository';
import { resolveDisputeRepository } from './infrastructure/dispute-repository.provider';
import { DisputesBookingController, DisputesOperatorController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [DisputesBookingController, DisputesOperatorController],
  providers: [
    DisputesService,
    InMemoryDisputeRepository,
    {
      provide: DISPUTE_REPOSITORY,
      inject: [InMemoryDisputeRepository, PostgresClient],
      useFactory: (inMemoryRepository: InMemoryDisputeRepository, postgresClient: PostgresClient) =>
        resolveDisputeRepository({
          inMemoryRepository,
          postgresClient,
        }),
    },
  ],
  exports: [DisputesService],
})
export class DisputesModule {}
