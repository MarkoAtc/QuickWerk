import { Provider } from '@nestjs/common';

import { PAYMENT_METHOD_REPOSITORY } from '../domain/payment-method.repository';
import { InMemoryPaymentMethodRepository } from './in-memory-payment-method.repository';

export const paymentMethodRepositoryProvider: Provider = {
  provide: PAYMENT_METHOD_REPOSITORY,
  useClass: InMemoryPaymentMethodRepository,
};
