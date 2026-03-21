import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { HealthController } from './health.controller';

describe('HealthController', () => {
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

    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_WATCH_THRESHOLD_PERCENT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_CRITICAL_THRESHOLD_PERCENT;

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps legacy /health payload stable', () => {
    const controller = new HealthController({} as PostgresRelayAttemptExecutor);

    expect(controller.getHealth()).toEqual({
      service: 'platform-api',
      status: 'bootstrap-ready',
    });
  });

  it('returns queue readiness counters, lag thresholds, and SLO window in postgres-persistent mode', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T18:30:00.000Z'));

    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';
    process.env.BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES = '30';
    process.env.BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT = '20';

    const controller = new HealthController({
      getQueueMetricsSnapshot: vi.fn().mockResolvedValue({
        depth: 4,
        dueCount: 2,
        deadLetterCount: 0,
        processingLagMs: 1000,
      }),
      listQueueMetricSnapshots: vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            capturedAt: '2026-03-20T18:00:00.000Z',
            correlationId: 'corr-1',
            metrics: {
              depth: 12,
              dueCount: 11,
              deadLetterCount: 0,
              processingLagMs: 18000,
            },
          },
          {
            id: 2,
            capturedAt: '2026-03-20T18:20:00.000Z',
            correlationId: 'corr-2',
            metrics: {
              depth: 3,
              dueCount: 2,
              deadLetterCount: 0,
              processingLagMs: 1000,
            },
          },
        ],
        hasMore: false,
        nextOffset: null,
        retained: 50,
      }),
    } as unknown as PostgresRelayAttemptExecutor);

    await expect(controller.getReadiness()).resolves.toMatchObject({
      service: 'platform-api',
      status: 'ready',
      relayQueue: {
        mode: 'postgres-persistent',
        enabled: true,
        level: 'good',
        counters: {
          depth: 4,
          dueCount: 2,
          deadLetterCount: 0,
        },
        lagMs: 1000,
        thresholds: {
          lagWatchMs: 15000,
          lagCriticalMs: 60000,
          depthWatchCount: 10,
          depthCriticalCount: 50,
          dueWatchCount: 10,
          dueCriticalCount: 50,
        },
        sloWindow: {
          windowMinutes: 30,
          sampleCount: 3,
        },
      },
    });
  });

  it('reports readiness watch/critical levels based on queue pressure', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const metrics = vi
      .fn()
      .mockResolvedValueOnce({ depth: 12, dueCount: 11, deadLetterCount: 0, processingLagMs: 16000 })
      .mockResolvedValueOnce({ depth: 20, dueCount: 60, deadLetterCount: 6, processingLagMs: 62000 });

    const controller = new HealthController({
      getQueueMetricsSnapshot: metrics,
      listQueueMetricSnapshots: vi.fn().mockResolvedValue({
        items: [],
        hasMore: false,
        nextOffset: null,
        retained: 0,
      }),
    } as unknown as PostgresRelayAttemptExecutor);

    const watch = await controller.getReadiness();
    expect(watch).toMatchObject({
      status: 'ready',
      relayQueue: {
        level: 'watch',
      },
    });

    const critical = await controller.getReadiness();
    expect(critical).toMatchObject({
      status: 'degraded',
      relayQueue: {
        level: 'critical',
      },
    });
  });

  it('applies env-tuned lag/depth/dead-letter readiness thresholds', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS = '2500';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS = '5000';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT = '2';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT = '3';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT = '4';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT = '8';

    const controller = new HealthController({
      getQueueMetricsSnapshot: vi.fn().mockResolvedValue({
        depth: 5,
        dueCount: 1,
        deadLetterCount: 2,
        processingLagMs: 1000,
      }),
      listQueueMetricSnapshots: vi.fn().mockResolvedValue({
        items: [],
        hasMore: false,
        nextOffset: null,
        retained: 0,
      }),
    } as unknown as PostgresRelayAttemptExecutor);

    const readiness = await controller.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      relayQueue: {
        level: 'watch',
        thresholds: {
          lagWatchMs: 2500,
          lagCriticalMs: 5000,
          deadLetterWatchCount: 2,
          deadLetterCriticalCount: 3,
          depthWatchCount: 4,
          depthCriticalCount: 8,
          dueWatchCount: 4,
          dueCriticalCount: 8,
        },
      },
    });
  });
});
