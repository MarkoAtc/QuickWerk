import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { providerProfileRepositoryProvider } from './infrastructure/provider-profile-repository.provider';
import { providerVerificationRepositoryProvider } from './infrastructure/provider-verification-repository.provider';
import { InMemoryUploadUrlRepository } from './infrastructure/in-memory-upload-url.repository';
import { uploadUrlRepositoryProvider } from './infrastructure/upload-url-repository.provider';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    providerVerificationRepositoryProvider,
    providerProfileRepositoryProvider,
    InMemoryUploadUrlRepository,
    uploadUrlRepositoryProvider,
  ],
  exports: [ProvidersService],
})
export class ProvidersModule {}
