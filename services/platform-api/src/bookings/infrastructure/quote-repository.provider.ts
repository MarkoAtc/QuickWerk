import { Provider } from '@nestjs/common';

import { QUOTE_REPOSITORY } from '../domain/quote.repository';
import { InMemoryQuoteRepository } from './in-memory-quote.repository';

export const quoteRepositoryProvider: Provider = {
  provide: QUOTE_REPOSITORY,
  useClass: InMemoryQuoteRepository,
};
