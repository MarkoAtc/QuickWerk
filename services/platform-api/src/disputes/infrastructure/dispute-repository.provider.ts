import { Provider } from '@nestjs/common';

import { DISPUTE_REPOSITORY } from '../domain/dispute.repository';
import { InMemoryDisputeRepository } from './in-memory-dispute.repository';

export const disputeRepositoryProvider: Provider = {
  provide: DISPUTE_REPOSITORY,
  useExisting: InMemoryDisputeRepository,
};
