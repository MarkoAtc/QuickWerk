import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { providerProfileRepositoryProvider } from './infrastructure/provider-profile-repository.provider';
import { providerVerificationRepositoryProvider } from './infrastructure/provider-verification-repository.provider';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, providerVerificationRepositoryProvider, providerProfileRepositoryProvider],
  exports: [ProvidersService],
})
export class ProvidersModule {}
