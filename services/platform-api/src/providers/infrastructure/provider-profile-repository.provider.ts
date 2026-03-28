import { Provider } from '@nestjs/common';

import { PROVIDER_PROFILE_REPOSITORY } from '../domain/provider-profile.repository';
import { InMemoryProviderProfileRepository } from './in-memory-provider-profile.repository';

export const providerProfileRepositoryProvider: Provider = {
  provide: PROVIDER_PROFILE_REPOSITORY,
  useClass: InMemoryProviderProfileRepository,
};
