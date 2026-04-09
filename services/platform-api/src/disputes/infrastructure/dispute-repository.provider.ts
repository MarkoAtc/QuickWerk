import { PostgresClient } from '../../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../../persistence/persistence-mode';
import { DisputeRepository } from '../domain/dispute.repository';
import { InMemoryDisputeRepository } from './in-memory-dispute.repository';
import { PostgresDisputeRepository } from './postgres-dispute.repository';

export function resolveDisputeRepository(params: {
  inMemoryRepository: InMemoryDisputeRepository;
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): DisputeRepository {
  const env = params.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'in-memory') {
    return params.inMemoryRepository;
  }

  const postgresConfig = requirePostgresPersistenceConfig(env);

  return new PostgresDisputeRepository(params.postgresClient, postgresConfig);
}
