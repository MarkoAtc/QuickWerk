import { Provider } from '@nestjs/common';

import { PAYOUT_REPOSITORY } from '../domain/payout.repository';
import { InMemoryPayoutRepository } from './in-memory-payout.repository';

export const payoutRepositoryProvider: Provider = {
  provide: PAYOUT_REPOSITORY,
  useClass: InMemoryPayoutRepository,
};
