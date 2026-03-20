import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [HealthController],
})
export class AppModule {}
