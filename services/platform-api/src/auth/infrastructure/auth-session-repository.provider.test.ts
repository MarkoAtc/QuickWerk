import { describe, expect, it } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { resolveAuthSessionRepository } from './auth-session-repository.provider';
import { InMemoryAuthSessionRepository } from './in-memory-auth-session.repository';
import { PostgresAuthSessionRepository } from './postgres-auth-session.repository';

describe('resolveAuthSessionRepository', () => {
  it('uses in-memory repository by default', () => {
    const inMemoryRepository = new InMemoryAuthSessionRepository();
    const repository = resolveAuthSessionRepository({
      inMemoryRepository,
      postgresClient: new PostgresClient(),
      env: {},
    });

    expect(repository).toBe(inMemoryRepository);
  });

  it('fails fast when postgres mode is selected without DATABASE_URL', () => {
    expect(() =>
      resolveAuthSessionRepository({
        inMemoryRepository: new InMemoryAuthSessionRepository(),
        postgresClient: new PostgresClient(),
        env: {
          PERSISTENCE_MODE: 'postgres',
        },
      }),
    ).toThrow('PERSISTENCE_MODE=postgres requires DATABASE_URL to be set.');
  });

  it('returns postgres auth repository in postgres mode', () => {
    const repository = resolveAuthSessionRepository({
      inMemoryRepository: new InMemoryAuthSessionRepository(),
      postgresClient: new PostgresClient(),
      env: {
        PERSISTENCE_MODE: 'postgres',
        DATABASE_URL: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
      },
    });

    expect(repository).toBeInstanceOf(PostgresAuthSessionRepository);
  });
});
