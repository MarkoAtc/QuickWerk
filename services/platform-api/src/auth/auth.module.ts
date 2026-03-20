import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_SESSION_REPOSITORY } from './domain/auth-session.repository';
import { InMemoryAuthSessionRepository } from './infrastructure/in-memory-auth-session.repository';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    InMemoryAuthSessionRepository,
    {
      provide: AUTH_SESSION_REPOSITORY,
      useExisting: InMemoryAuthSessionRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
