import { describe, expect, it } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { resolveDisputeRepository } from './dispute-repository.provider';
import { InMemoryDisputeRepository } from './in-memory-dispute.repository';
import { PostgresDisputeRepository } from './postgres-dispute.repository';

describe('resolveDisputeRepository', () => {
  it('returns in-memory repository by default', () => {
    const inMemoryRepository = new InMemoryDisputeRepository();

    const repository = resolveDisputeRepository({
      inMemoryRepository,
      postgresClient: new PostgresClient(),
      env: {},
    });

    expect(repository).toBe(inMemoryRepository);
  });

  it('returns postgres repository in postgres mode', () => {
    const inMemoryRepository = new InMemoryDisputeRepository();

    const repository = resolveDisputeRepository({
      inMemoryRepository,
      postgresClient: new PostgresClient(),
      env: {
        PERSISTENCE_MODE: 'postgres',
        DATABASE_URL: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
      },
    });

    expect(repository).toBeInstanceOf(PostgresDisputeRepository);
  });
});
