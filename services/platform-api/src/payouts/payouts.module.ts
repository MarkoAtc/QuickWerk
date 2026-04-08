import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PostgresClient } from '../persistence/postgres-client';
import { PAYOUT_REPOSITORY } from './domain/payout.repository';
import { InMemoryPayoutRepository } from './infrastructure/in-memory-payout.repository';
import { resolvePayoutRepository } from './infrastructure/payout-repository.provider';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [AuthModule],
  controllers: [PayoutsController],
  providers: [
    PayoutsService,
    InMemoryPayoutRepository,
    {
      provide: PAYOUT_REPOSITORY,
      inject: [InMemoryPayoutRepository, PostgresClient],
      useFactory: (inMemoryRepository: InMemoryPayoutRepository, postgresClient: PostgresClient) =>
        resolvePayoutRepository({
          inMemoryRepository,
          postgresClient,
        }),
    },
  ],
  exports: [PayoutsService],
})
export class PayoutsModule {}
