import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { InMemoryDisputeRepository } from './infrastructure/in-memory-dispute.repository';
import { disputeRepositoryProvider } from './infrastructure/dispute-repository.provider';
import { DisputesBookingController, DisputesOperatorController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [DisputesBookingController, DisputesOperatorController],
  providers: [DisputesService, InMemoryDisputeRepository, disputeRepositoryProvider],
  exports: [DisputesService],
})
export class DisputesModule {}
