import { Provider } from '@nestjs/common';

import { PAYMENT_REPOSITORY } from '../domain/payment.repository';
import { InMemoryPaymentRepository } from './in-memory-payment.repository';

export const paymentRepositoryProvider: Provider = {
  provide: PAYMENT_REPOSITORY,
  useClass: InMemoryPaymentRepository,
};
