import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { providerVerificationRepositoryProvider } from './infrastructure/provider-verification-repository.provider';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, providerVerificationRepositoryProvider],
  exports: [ProvidersService],
})
export class ProvidersModule {}
