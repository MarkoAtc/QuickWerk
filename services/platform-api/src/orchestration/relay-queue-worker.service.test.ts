import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostgresRelayAttemptExecutor } from './relay-attempt-executor';
import { RelayQueueWorkerService } from './relay-queue-worker.service';

describe('RelayQueueWorkerService', () => {
  const previousExecutorMode = process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE;
  const previousPersistenceMode = process.env.PERSISTENCE_MODE;

  afterEach(() => {
    if (previousExecutorMode === undefined) {
      delete process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE;
    } else {
      process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = previousExecutorMode;
    }

    if (previousPersistenceMode === undefined) {
      delete process.env.PERSISTENCE_MODE;
    } else {
      process.env.PERSISTENCE_MODE = previousPersistenceMode;
    }

    vi.restoreAllMocks();
  });

  it('drains due retries only when postgres-persistent relay worker is enabled', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const drain = vi.fn().mockResolvedValue({ drainedCount: 1 });
    const service = new RelayQueueWorkerService({
      drainDueRetriesTick: drain,
    } as unknown as PostgresRelayAttemptExecutor);

    await expect(service.tick({ now: new Date('2026-03-20T12:00:00.000Z'), maxDrains: 2 })).resolves.toEqual({
      drainedCount: 1,
      skipped: false,
    });
    expect(drain).toHaveBeenCalledTimes(1);
  });

  it('skips tick when relay worker mode is not postgres-persistent', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';
    process.env.PERSISTENCE_MODE = 'postgres';

    const drain = vi.fn();
    const service = new RelayQueueWorkerService({
      drainDueRetriesTick: drain,
    } as unknown as PostgresRelayAttemptExecutor);

    await expect(service.tick()).resolves.toEqual({
      drainedCount: 0,
      skipped: true,
    });
    expect(drain).not.toHaveBeenCalled();
  });
});
