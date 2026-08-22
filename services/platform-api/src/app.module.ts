import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { DisputesModule } from './disputes/disputes.module';
import { HealthController } from './health/health.controller';
import { InvoicesModule } from './invoices/invoices.module';
import { RelayQueueOperatorController } from './operators/relay-queue.controller';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PersistenceModule } from './persistence/persistence.module';
import { ProvidersModule } from './providers/providers.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    BookingsModule,
    ProvidersModule,
    PaymentMethodsModule,
    PayoutsModule,
    InvoicesModule,
    DisputesModule,
    ReviewsModule,
  ],
  controllers: [HealthController, RelayQueueOperatorController],
})
export class AppModule {}
