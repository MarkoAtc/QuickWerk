import { BookingRepository } from '../domain/booking.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../../persistence/persistence-mode';
import { InMemoryBookingRepository } from './in-memory-booking.repository';
import { PostgresBookingRepository } from './postgres-booking.repository';

export function resolveBookingRepository(params: {
  inMemoryRepository: InMemoryBookingRepository;
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): BookingRepository {
  const env = params.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'in-memory') {
    return params.inMemoryRepository;
  }

  const postgresConfig = requirePostgresPersistenceConfig(env);

  return new PostgresBookingRepository(params.postgresClient, postgresConfig);
}
