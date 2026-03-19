import { Module } from '@nestjs/common';

import { AuthController } from './auth/auth.controller';
import { HealthController } from './health/health.controller';
import { MarketplaceController } from './marketplace/marketplace.controller';

@Module({
  controllers: [AuthController, HealthController, MarketplaceController],
})
export class AppModule {}