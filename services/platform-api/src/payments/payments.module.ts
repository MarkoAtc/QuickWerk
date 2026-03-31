import { Module } from '@nestjs/common';

import { InMemoryPaymentRepository } from './infrastructure/in-memory-payment.repository';
import { paymentRepositoryProvider } from './infrastructure/payment-repository.provider';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService, InMemoryPaymentRepository, paymentRepositoryProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
