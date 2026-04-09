import { Module } from '@nestjs/common';

import { InvoicesModule } from '../invoices/invoices.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { InMemoryPaymentRepository } from './infrastructure/in-memory-payment.repository';
import { paymentRepositoryProvider } from './infrastructure/payment-repository.provider';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PayoutsModule, InvoicesModule],
  providers: [PaymentsService, InMemoryPaymentRepository, paymentRepositoryProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
