import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionStoreService } from './session-store.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionStoreService],
  exports: [AuthService],
})
export class AuthModule {}
