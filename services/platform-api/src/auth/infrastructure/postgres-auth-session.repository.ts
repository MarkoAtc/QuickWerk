import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
} from '../domain/auth-session.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';

export class PostgresAuthSessionRepository implements AuthSessionRepository {
  constructor(
    private readonly _postgresClient: PostgresClient,
    private readonly _postgresConfig: PostgresPersistenceConfig,
  ) {}

  createSession(_input: CreateAuthSessionInput): AuthSession {
    throw new Error(
      'Postgres auth session repository is scaffolded but not active yet. Current auth repository contracts are synchronous; implement async contract migration before enabling PERSISTENCE_MODE=postgres.',
    );
  }

  resolveSession(_token: string | null | undefined): AuthSession | null {
    throw new Error(
      'Postgres auth session repository is scaffolded but not active yet. Current auth repository contracts are synchronous; implement async contract migration before enabling PERSISTENCE_MODE=postgres.',
    );
  }

  deleteSession(_token: string | null | undefined): boolean {
    throw new Error(
      'Postgres auth session repository is scaffolded but not active yet. Current auth repository contracts are synchronous; implement async contract migration before enabling PERSISTENCE_MODE=postgres.',
    );
  }
}
