import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health/health.controller';
import { InvoicesModule } from './invoices/invoices.module';
import { RelayQueueOperatorController } from './operators/relay-queue.controller';
import { PayoutsModule } from './payouts/payouts.module';
import { PersistenceModule } from './persistence/persistence.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [PersistenceModule, AuthModule, BookingsModule, ProvidersModule, PayoutsModule, InvoicesModule],
  controllers: [HealthController, RelayQueueOperatorController],
})
export class AppModule {}
