import { Module } from '@nestjs/common';

import { AuthController } from './auth/auth.controller';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [AuthController, HealthController],
})
export class AppModule {}