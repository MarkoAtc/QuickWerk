import { InvoiceRepository } from '../domain/invoice.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../../persistence/persistence-mode';
import { InMemoryInvoiceRepository } from './in-memory-invoice.repository';
import { PostgresInvoiceRepository } from './postgres-invoice.repository';

export function resolveInvoiceRepository(params: {
  inMemoryRepository: InMemoryInvoiceRepository;
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): InvoiceRepository {
  const env = params.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'in-memory') {
    return params.inMemoryRepository;
  }

  const postgresConfig = requirePostgresPersistenceConfig(env);

  return new PostgresInvoiceRepository(params.postgresClient, postgresConfig);
}
