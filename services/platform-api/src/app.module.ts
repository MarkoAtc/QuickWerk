import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health/health.controller';
import { RelayQueueOperatorController } from './operators/relay-queue.controller';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [PersistenceModule, AuthModule, BookingsModule],
  controllers: [HealthController, RelayQueueOperatorController],
})
export class AppModule {}
