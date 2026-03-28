import { Provider } from '@nestjs/common';

import { PROVIDER_VERIFICATION_REPOSITORY } from '../domain/provider-verification.repository';
import { InMemoryProviderVerificationRepository } from './in-memory-provider-verification.repository';

export const providerVerificationRepositoryProvider: Provider = {
  provide: PROVIDER_VERIFICATION_REPOSITORY,
  useClass: InMemoryProviderVerificationRepository,
};
