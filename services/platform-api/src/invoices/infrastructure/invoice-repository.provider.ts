import { Provider } from '@nestjs/common';

import { INVOICE_REPOSITORY } from '../domain/invoice.repository';
import { InMemoryInvoiceRepository } from './in-memory-invoice.repository';

export const invoiceRepositoryProvider: Provider = {
  provide: INVOICE_REPOSITORY,
  useClass: InMemoryInvoiceRepository,
};
