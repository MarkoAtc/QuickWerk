import { Provider } from '@nestjs/common';

import { REVIEW_REPOSITORY } from '../domain/review.repository';
import { InMemoryReviewRepository } from './in-memory-review.repository';

export const reviewRepositoryProvider: Provider = {
  provide: REVIEW_REPOSITORY,
  useExisting: InMemoryReviewRepository,
};
