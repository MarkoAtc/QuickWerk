import { AuthSessionRepository } from '../domain/auth-session.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../../persistence/persistence-mode';
import { InMemoryAuthSessionRepository } from './in-memory-auth-session.repository';
import { PostgresAuthSessionRepository } from './postgres-auth-session.repository';

export function resolveAuthSessionRepository(params: {
  inMemoryRepository: InMemoryAuthSessionRepository;
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): AuthSessionRepository {
  const env = params.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'in-memory') {
    return params.inMemoryRepository;
  }

  const postgresConfig = requirePostgresPersistenceConfig(env);
  void new PostgresAuthSessionRepository(params.postgresClient, postgresConfig);

  throw new Error(
    'PERSISTENCE_MODE=postgres is not yet enabled for auth sessions. Postgres repository scaffolds are in place but repository contracts are currently synchronous. Keep PERSISTENCE_MODE=in-memory until async repository migration is implemented.',
  );
}
