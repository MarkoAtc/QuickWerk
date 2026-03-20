import {
  AcceptSubmittedBookingInput,
  AcceptSubmittedBookingResult,
  BookingRecord,
  BookingRepository,
  CreateSubmittedBookingInput,
} from '../domain/booking.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';

export class PostgresBookingRepository implements BookingRepository {
  constructor(
    private readonly _postgresClient: PostgresClient,
    private readonly _postgresConfig: PostgresPersistenceConfig,
  ) {}

  createSubmittedBooking(_input: CreateSubmittedBookingInput): BookingRecord {
    throw new Error(
      'Postgres booking repository is scaffolded but not active yet. Current booking repository contracts are synchronous; implement async contract migration before enabling PERSISTENCE_MODE=postgres.',
    );
  }

  acceptSubmittedBooking(_input: AcceptSubmittedBookingInput): AcceptSubmittedBookingResult {
    throw new Error(
      'Postgres booking repository is scaffolded but not active yet. Current booking repository contracts are synchronous; implement async contract migration before enabling PERSISTENCE_MODE=postgres.',
    );
  }
}
