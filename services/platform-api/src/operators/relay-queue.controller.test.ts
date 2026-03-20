import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { RelayQueueOperatorController } from './relay-queue.controller';

describe('RelayQueueOperatorController', () => {
  const previousExecutorMode = process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE;
  const previousPersistenceMode = process.env.PERSISTENCE_MODE;
  const previousOperatorAuthMode = process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE;
  const previousOperatorAllowedRoles = process.env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES;

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

    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT;
    delete process.env.BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION;
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
    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({
          token: 'token-customer',
          userId: 'user-1',
          email: 'customer@quickwerk.local',
          role: 'customer',
          createdAt: '2026-03-20T10:00:00.000Z',
          expiresAt: '2026-03-20T22:00:00.000Z',
        }),
      } as unknown as AuthService,
      {
        listQueueAttempts: vi.fn(),
      } as unknown as PostgresRelayAttemptExecutor,
    );

    await expect(controller.getAttempts('Bearer token-customer', {})).rejects.toMatchObject({
      status: 403,
      message: 'Operator authorization required.',
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
      },
    });
  });

  it('returns queue snapshots, readiness level, and retention metadata', async () => {
    process.env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE = 'postgres-persistent';
    process.env.PERSISTENCE_MODE = 'postgres';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT = '5';
    process.env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT = '15';

    const controller = new RelayQueueOperatorController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({ role: 'provider' }),
      } as unknown as AuthService,
      {
        listQueueMetricSnapshots: vi.fn().mockResolvedValue({
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
      } as unknown as PostgresRelayAttemptExecutor,
    );

    const response = await controller.getSnapshots('Bearer token-provider', {
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
          durability: 'postgres-table',
        },
      },
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
