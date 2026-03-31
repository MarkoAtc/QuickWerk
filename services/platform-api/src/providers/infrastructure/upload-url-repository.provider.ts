import { Provider } from '@nestjs/common';

import { UPLOAD_URL_REPOSITORY } from '../domain/upload-url.repository';
import { InMemoryUploadUrlRepository } from './in-memory-upload-url.repository';

export const uploadUrlRepositoryProvider: Provider = {
  provide: UPLOAD_URL_REPOSITORY,
  useClass: InMemoryUploadUrlRepository,
};
