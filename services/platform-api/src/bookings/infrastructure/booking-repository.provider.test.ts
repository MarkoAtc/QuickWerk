import { describe, expect, it } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { resolveBookingRepository } from './booking-repository.provider';
import { InMemoryBookingRepository } from './in-memory-booking.repository';

describe('resolveBookingRepository', () => {
  it('uses in-memory repository by default', () => {
    const inMemoryRepository = new InMemoryBookingRepository();
    const repository = resolveBookingRepository({
      inMemoryRepository,
      postgresClient: new PostgresClient(),
      env: {},
    });

    expect(repository).toBe(inMemoryRepository);
  });

  it('fails fast with explicit unsupported message in postgres mode', () => {
    expect(() =>
      resolveBookingRepository({
        inMemoryRepository: new InMemoryBookingRepository(),
        postgresClient: new PostgresClient(),
        env: {
          PERSISTENCE_MODE: 'postgres',
          DATABASE_URL: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
        },
      }),
    ).toThrow('PERSISTENCE_MODE=postgres is not yet enabled for bookings.');
  });
});
