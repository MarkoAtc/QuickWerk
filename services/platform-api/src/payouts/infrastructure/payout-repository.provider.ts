import { PayoutRepository } from '../domain/payout.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../../persistence/persistence-mode';
import { InMemoryPayoutRepository } from './in-memory-payout.repository';
import { PostgresPayoutRepository } from './postgres-payout.repository';

export function resolvePayoutRepository(params: {
  inMemoryRepository: InMemoryPayoutRepository;
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): PayoutRepository {
  const env = params.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'in-memory') {
    return params.inMemoryRepository;
  }

  const postgresConfig = requirePostgresPersistenceConfig(env);

  return new PostgresPayoutRepository(params.postgresClient, postgresConfig);
}
