import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { resetRelayQueueExportHandoffsForTests } from './relay-queue-export-handoff';
import { RelayQueueOperatorController } from './relay-queue.controller';
import { resetRelayQueueOperatorTelemetryForTests } from './relay-queue-telemetry';

describe('RelayQueueOperatorController', () => {
  const previousExecutorMode = process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE;
  const previousPersistenceMode = process.env.PERSISTENCE_MODE;
  const previousOperatorAuthMode = process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE;
  const previousOperatorAllowedRoles = process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES;
  const previousOperatorRoleMode = process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE;

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

    if (previousOperatorAuthMode === undefined) {
      delete process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE;
    } else {
      process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE = previousOperatorAuthMode;
    }

    if (previousOperatorAllowedRoles === undefined) {
      delete process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES;
    } else {
      process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES = previousOperatorAllowedRoles;
    }

    if (previousOperatorRoleMode === undefined) {
      delete process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE;
    } else {
      process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE = previousOperatorRoleMode;
    }

    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_WATCH_THRESHOLD_PERCENT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_CRITICAL_THRESHOLD_PERCENT;
    delete process.env.BOOKING_ACCEPTED_RELAY_SLO_TREND_BUCKET_MINUTES;
    resetRelayQueueOperatorTelemetryForTests();
    resetRelayQueueExportHandoffsForTests();
    vi.restoreAllMocks();
  });

  it('requires bearer auth for operator endpoints by default', async () => {
    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn(),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts(undefined, {})).rejects.toMatchObject({
      status: 401,
      message: 'Operator authentication required.',
    });
  });

  it('returns forbidden when authenticated role is not operator-allowed', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE = 'operator-strict';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({
          token: 'token-provider',
          userId: 'user-1',
          email: 'provider@quickwerk.local',
          role: 'provider',
          createdAt: '2026-03-20T10:00:00.000Z',
          expiresAt: '2026-03-20T22:00:00.000Z',
        }),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts('Bearer token-provider', {})).rejects.toMatchObject({
      status: 403,
      message: 'Operator authorization required.',
    });
  });

  it('increments denied-role telemetry counters in strict mode', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE = 'operator-strict';

    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValueOnce({ role: 'provider' }).mockResolvedValueOnce({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts('Bearer token-provider', {})).rejects.toMatchObject({
      status: 403,
    });

    const followup = await controller.getAttempts('Bearer token-operator', {});

    expect(followup).toMatchObject({
      relayQueue: {
        operatorAuthTelemetry: {
          roleModeUsage: {
            'operator-strict': 2,
          },
          deniedRoleCount: {
            provider: 1,
          },
          totalAccessChecks: 2,
        },
      },
    });
  });

  it('keeps provider compatibility in transition mode while enabling dedicated operator sessions', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';

    const resolveSessionOrNull = vi
      .fn()
      .mockResolvedValueOnce({ role: 'provider' })
      .mockResolvedValueOnce({ role: 'operator' });

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull,
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts('Bearer provider-token', {})).resolves.toMatchObject({
      relayQueue: {
        enabled: false,
      },
    });

    await expect(controller.getAttempts('Bearer operator-token', {})).resolves.toMatchObject({
      relayQueue: {
        enabled: false,
      },
    });
  });

  it('returns disabled response when relay mode is not postgres-persistent', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'provider' }),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts('Bearer token-provider', {})).resolves.toMatchObject({
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

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'provider' }),
      } as unknown as AuthService,
      {
        listQueueAttempts,
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const response = await controller.getAttempts('Bearer token-provider', {
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
        operatorAuthTelemetry: {
          roleModeUsage: {
            'operator-provider-transition': 1,
            'operator-strict': 0,
          },
          deniedRoleCount: {
            provider: 0,
          },
          deniedAuthCount: 0,
          totalAccessChecks: 1,
        },
      },
    });
  });

  it('returns queue snapshots with readiness + SLO window metadata', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T18:30:00.000Z'));

    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT = '5';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT = '15';
    process.env.BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES = '30';
    process.env.BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT = '50';
    process.env.BOOKING_ACCEPTED_RELAY_SLO_TREND_BUCKET_MINUTES = '15';

    const listQueueMetricSnapshots = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 7,
            capturedAt: '2026-03-20T18:00:00.000Z',
            correlationId: 'corr-window-1',
            metrics: {
              depth: 6,
              dueCount: 6,
              deadLetterCount: 0,
              processingLagMs: 2000,
            },
          },
          {
            id: 8,
            capturedAt: '2026-03-20T18:15:00.000Z',
            correlationId: 'corr-window-2',
            metrics: {
              depth: 1,
              dueCount: 1,
              deadLetterCount: 0,
              processingLagMs: 800,
            },
          },
        ],
        hasMore: false,
        nextOffset: null,
        retained: 12,
      });

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueMetricSnapshots,
        getQueueMetricsSnapshot: vi.fn().mockResolvedValue({
          depth: 8,
          dueCount: 6,
          deadLetterCount: 0,
          processingLagMs: 3000,
        }),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const response = await controller.getSnapshots('Bearer token-operator', {
      limit: '10',
      offset: '0',
      correlationId: 'corr-tick-5',
    });

    expect(listQueueMetricSnapshots).toHaveBeenNthCalledWith(1, {
      limit: 10,
      offset: 0,
      correlationId: 'corr-tick-5',
    });
    expect(listQueueMetricSnapshots).toHaveBeenNthCalledWith(2, {
      limit: 50,
      offset: 0,
      sinceCapturedAt: '2026-03-20T18:00:00.000Z',
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
          sloWindow: {
            windowMinutes: 30,
          },
          sloTrend: {
            windowMinutes: 30,
            bucketMinutes: 15,
            buckets: [
              {
                bucketStart: '2026-03-20T18:00:00.000Z',
                bucketEnd: '2026-03-20T18:15:00.000Z',
              },
              {
                bucketStart: '2026-03-20T18:15:00.000Z',
                bucketEnd: '2026-03-20T18:30:00.000Z',
              },
            ],
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
          durability: 'postgres-table',
        },
      },
    });

    vi.useRealTimers();
  });

  it('returns prefiltered snapshot presets for dashboard windows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T18:30:00.000Z'));

    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const listQueueMetricSnapshots = vi.fn().mockResolvedValue({
      items: [
        {
          id: 21,
          capturedAt: '2026-03-20T18:20:00.000Z',
          correlationId: 'corr-preset-21',
          metrics: {
            depth: 4,
            dueCount: 4,
            deadLetterCount: 0,
            processingLagMs: 1200,
          },
        },
      ],
      hasMore: false,
      nextOffset: null,
      retained: 25,
    });

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueMetricSnapshots,
        getQueueMetricsSnapshot: vi.fn().mockResolvedValue({
          depth: 4,
          dueCount: 4,
          deadLetterCount: 0,
          processingLagMs: 1200,
        }),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const response = await controller.getSnapshotsPreset('Bearer token-operator', '15m');

    expect(listQueueMetricSnapshots).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      sinceCapturedAt: '2026-03-20T18:15:00.000Z',
    });

    expect(response).toMatchObject({
      relayQueue: {
        enabled: true,
        preset: {
          window: '15m',
          windowMinutes: 15,
        },
        snapshots: [
          {
            id: 21,
            correlationId: 'corr-preset-21',
          },
        ],
        endpointLatencyTelemetry: {
          sampleCap: 200,
        },
      },
    });

    vi.useRealTimers();
  });

  it('returns bounded dead-letter CSV export with safe default fields', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const setHeader = vi.fn();
    const listQueueAttempts = vi.fn().mockResolvedValue({
      items: [
        {
          id: 91,
          eventId: 'evt-91',
          correlationId: 'corr-91',
          attempt: 3,
          maxAttempts: 3,
          status: 'dead-letter',
          nextAttemptAt: null,
          terminalMarker: true,
          createdAt: '2026-03-20T17:00:00.000Z',
          updatedAt: '2026-03-20T17:05:00.000Z',
          processedAt: '2026-03-20T17:05:00.000Z',
        },
      ],
      hasMore: false,
      nextOffset: null,
    });

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueAttempts,
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const csv = await controller.getAttemptsCsv(
      'Bearer token-operator',
      {
        limit: '999',
      },
      { setHeader },
    );

    expect(listQueueAttempts).toHaveBeenCalledWith({
      limit: 100,
      offset: 0,
      status: 'dead-letter',
      correlationId: undefined,
      eventId: undefined,
      terminalOnly: true,
    });

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(csv).toContain('id,eventId,correlationId,attempt,maxAttempts,status,processedAt');
    expect(csv).toContain('91,evt-91,corr-91,3,3,dead-letter,2026-03-20T17:05:00.000Z');
  });

  it('creates non-blocking CSV handoff for larger bounded export windows', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const listQueueAttempts = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            id: 201,
            eventId: 'evt-201',
            correlationId: 'corr-201',
            attempt: 3,
            maxAttempts: 3,
            status: 'dead-letter',
            nextAttemptAt: null,
            terminalMarker: true,
            createdAt: '2026-03-20T16:59:00.000Z',
            updatedAt: '2026-03-20T17:00:00.000Z',
            processedAt: '2026-03-20T17:00:00.000Z',
          },
        ],
        hasMore: false,
        nextOffset: null,
      });

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueAttempts,
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const created = await controller.startAttemptsCsvHandoff('Bearer token-operator', {
      limit: '500',
      terminalOnly: 'true',
      fields: 'id,eventId,status,processedAt',
    });

    expect(created).toMatchObject({
      relayQueue: {
        exportHandoff: {
          status: 'pending',
          rowLimit: 500,
        },
      },
    });

    const handoffId = created.relayQueue.exportHandoff.id;

    await vi.waitFor(async () => {
      const poll = await controller.getAttemptsCsvHandoff(
        'Bearer token-operator',
        handoffId,
        {},
        { setHeader: vi.fn() },
      );

      if (typeof poll === 'string') {
        throw new Error('expected JSON handoff poll payload');
      }

      expect(poll.relayQueue.exportHandoff.status).toBe('ready');
    });

    const setHeader = vi.fn();
    const csv = await controller.getAttemptsCsvHandoff(
      'Bearer token-operator',
      handoffId,
      { download: '1' },
      { setHeader },
    );

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(csv).toContain('id,eventId,status,processedAt');
    expect(csv).toContain('201,evt-201,dead-letter,2026-03-20T17:00:00.000Z');
  });

  it('rejects unsupported CSV status/fields to keep export constrained', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'operator' }),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(
      controller.getAttemptsCsv(
        'Bearer token-operator',
        {
          status: 'processed',
        },
        { setHeader: vi.fn() },
      ),
    ).rejects.toMatchObject({
      status: 400,
    });

    await expect(
      controller.getAttemptsCsv(
        'Bearer token-operator',
        {
          fields: 'payloadSnapshot',
        },
        { setHeader: vi.fn() },
      ),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('supports legacy-open mode as backward-compatible operator auth fallback', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE = 'legacy-open';
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'in-memory';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn(),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts(undefined, {})).resolves.toMatchObject({
      relayQueue: {
        enabled: false,
      },
    });
  });
});
