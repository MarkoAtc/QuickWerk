import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { RelayQueueOperatorController } from './relay-queue.controller';

describe('RelayQueueOperatorController', () => {
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

    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT;
    vi.restoreAllMocks();
  });

  it('returns disabled response when relay mode is not postgres-persistent', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';

    const controller = new RelayQueueOperatorController({
      listQueueAttempts: vi.fn(),
    } as unknown as PostgresRelayAttemptExecutor);

    await expect(controller.getAttempts({})).resolves.toMatchObject({
      service: 'platform-api',
      relayQueue: {
        mode: 'in-memory',
        enabled: false,
      },
    });
  });

  it('returns paginated queue attempts with applied filters', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const listQueueAttempts = vi.fn().mockResolvedValue({
      items: [
        {
          id: 101,
          eventId: 'evt-101',
          correlationId: 'corr-101',
          attempt: 2,
          maxAttempts: 3,
          status: 'retry-scheduled',
          nextAttemptAt: '2026-03-20T18:00:00.000Z',
          terminalMarker: false,
          createdAt: '2026-03-20T17:59:00.000Z',
          updatedAt: '2026-03-20T17:59:01.000Z',
          processedAt: '2026-03-20T17:59:01.000Z',
        },
      ],
      hasMore: true,
      nextOffset: 11,
    });

    const controller = new RelayQueueOperatorController({
      listQueueAttempts,
    } as unknown as PostgresRelayAttemptExecutor);

    const response = await controller.getAttempts({
      limit: '10',
      offset: '1',
      status: 'retry-scheduled',
      correlationId: 'corr-101',
      eventId: 'evt-101',
      terminalOnly: 'false',
    });

    expect(listQueueAttempts).toHaveBeenCalledWith({
      limit: 10,
      offset: 1,
      status: 'retry-scheduled',
      correlationId: 'corr-101',
      eventId: 'evt-101',
      terminalOnly: false,
    });

    expect(response).toMatchObject({
      service: 'platform-api',
      relayQueue: {
        mode: 'postgres-persistent',
        enabled: true,
        pagination: {
          limit: 10,
          offset: 1,
          returned: 1,
          hasMore: true,
          nextOffset: 11,
        },
        filters: {
          status: 'retry-scheduled',
          correlationId: 'corr-101',
          eventId: 'evt-101',
          terminalOnly: false,
        },
      },
    });
  });

  it('returns queue snapshots, readiness level, and retention metadata', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT = '5';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT = '15';

    const controller = new RelayQueueOperatorController({
      listQueueMetricSnapshots: vi.fn().mockReturnValue({
        items: [
          {
            id: 5,
            capturedAt: '2026-03-20T18:20:00.000Z',
            correlationId: 'corr-tick-5',
            metrics: {
              depth: 7,
              dueCount: 6,
              deadLetterCount: 0,
              processingLagMs: 3000,
            },
          },
        ],
        hasMore: false,
        nextOffset: null,
        retained: 12,
      }),
      getQueueMetricsSnapshot: vi.fn().mockResolvedValue({
        depth: 8,
        dueCount: 6,
        deadLetterCount: 0,
        processingLagMs: 3000,
      }),
    } as unknown as PostgresRelayAttemptExecutor);

    const response = await controller.getSnapshots({
      limit: '10',
      offset: '0',
      correlationId: 'corr-tick-5',
    });

    expect(response).toMatchObject({
      service: 'platform-api',
      relayQueue: {
        mode: 'postgres-persistent',
        enabled: true,
        current: {
          level: 'watch',
          metrics: {
            depth: 8,
            dueCount: 6,
            deadLetterCount: 0,
            processingLagMs: 3000,
          },
          thresholds: {
            depthWatchCount: 5,
            depthCriticalCount: 15,
          },
        },
        snapshots: [
          {
            id: 5,
            correlationId: 'corr-tick-5',
          },
        ],
        pagination: {
          limit: 10,
          offset: 0,
          returned: 1,
          hasMore: false,
          nextOffset: null,
        },
        filters: {
          correlationId: 'corr-tick-5',
        },
        retention: {
          retained: 12,
          maxSnapshots: 200,
          durability: 'process-memory',
        },
      },
    });
  });
});
