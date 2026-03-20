import { Module } from '@nestjs/common';

import { PostgresClient } from '../persistence/postgres-client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_SESSION_REPOSITORY } from './domain/auth-session.repository';
import { resolveAuthSessionRepository } from './infrastructure/auth-session-repository.provider';
import { InMemoryAuthSessionRepository } from './infrastructure/in-memory-auth-session.repository';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    InMemoryAuthSessionRepository,
    {
      provide: AUTH_SESSION_REPOSITORY,
      inject: [InMemoryAuthSessionRepository, PostgresClient],
      useFactory: (inMemoryRepository: InMemoryAuthSessionRepository, postgresClient: PostgresClient) =>
        resolveAuthSessionRepository({
          inMemoryRepository,
          postgresClient,
        }),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
