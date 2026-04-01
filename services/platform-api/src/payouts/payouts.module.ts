import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InMemoryPayoutRepository } from './infrastructure/in-memory-payout.repository';
import { payoutRepositoryProvider } from './infrastructure/payout-repository.provider';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [AuthModule],
  controllers: [PayoutsController],
  providers: [PayoutsService, InMemoryPayoutRepository, payoutRepositoryProvider],
  exports: [PayoutsService],
})
export class PayoutsModule {}
