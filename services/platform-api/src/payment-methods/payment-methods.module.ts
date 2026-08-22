import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { paymentMethodRepositoryProvider } from './infrastructure/payment-method-repository.provider';
import { InMemoryPaymentMethodRepository } from './infrastructure/in-memory-payment-method.repository';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, InMemoryPaymentMethodRepository, paymentMethodRepositoryProvider],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
