import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import {
  PostgresRelayAttemptExecutor,
  type RelayAttemptQueueStatus,
} from '../orchestration/relay-attempt-executor';
import { resolveRelayAttemptExecutorMode } from '../orchestration/relay-attempt-executor.provider';
import {
  deriveRelayQueueReadinessLevel,
  resolveRelayQueueReadinessThresholds,
} from '../health/readiness-thresholds';

type QueueAttemptsQuery = {
  limit?: string;
  offset?: string;
  status?: string;
  correlationId?: string;
  eventId?: string;
  terminalOnly?: string;
};

type QueueSnapshotsQuery = {
  limit?: string;
  offset?: string;
  correlationId?: string;
};

@Controller('operators/relay-queue')
export class RelayQueueOperatorController {
  constructor(private readonly postgresRelayAttemptExecutor: PostgresRelayAttemptExecutor) {}

  @Get('attempts')
  async getAttempts(@Query() query: QueueAttemptsQuery) {
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'queue inspection requires postgres-persistent relay mode',
        },
      };
    }

    const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();

    if (persistenceMode !== 'postgres') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'postgres-persistent relay mode requires PERSISTENCE_MODE=postgres',
        },
      };
    }

    const limit = parseLimit(query.limit, 20, 100);
    const offset = parseOffset(query.offset);
    const status = parseStatus(query.status);
    const terminalOnly = parseBooleanQuery(query.terminalOnly, false);

    const attempts = await this.postgresRelayAttemptExecutor.listQueueAttempts({
      limit,
      offset,
      status,
      correlationId: query.correlationId?.trim(),
      eventId: query.eventId?.trim(),
      terminalOnly,
    });

    return {
      service: 'platform-api',
      relayQueue: {
        mode: relayMode,
        enabled: true,
        attempts: attempts.items,
        pagination: {
          limit,
          offset,
          returned: attempts.items.length,
          hasMore: attempts.hasMore,
          nextOffset: attempts.nextOffset,
        },
        filters: {
          status: status ?? null,
          correlationId: query.correlationId?.trim() || null,
          eventId: query.eventId?.trim() || null,
          terminalOnly,
        },
      },
    };
  }

  @Get('snapshots')
  async getSnapshots(@Query() query: QueueSnapshotsQuery) {
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'queue snapshot inspection requires postgres-persistent relay mode',
        },
      };
    }

    const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();

    if (persistenceMode !== 'postgres') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'postgres-persistent relay mode requires PERSISTENCE_MODE=postgres',
        },
      };
    }

    const limit = parseLimit(query.limit, 20, 100);
    const offset = parseOffset(query.offset);
    const correlationId = query.correlationId?.trim();
    const snapshots = this.postgresRelayAttemptExecutor.listQueueMetricSnapshots({
      limit,
      offset,
      correlationId,
    });
    const current = await this.postgresRelayAttemptExecutor.getQueueMetricsSnapshot();
    const thresholds = resolveRelayQueueReadinessThresholds(process.env);
    const level = deriveRelayQueueReadinessLevel(current, thresholds);

    return {
      service: 'platform-api',
      relayQueue: {
        mode: relayMode,
        enabled: true,
        current: {
          capturedAt: new Date().toISOString(),
          level,
          metrics: current,
          thresholds,
        },
        snapshots: snapshots.items,
        pagination: {
          limit,
          offset,
          returned: snapshots.items.length,
          hasMore: snapshots.hasMore,
          nextOffset: snapshots.nextOffset,
        },
        filters: {
          correlationId: correlationId || null,
        },
        retention: {
          retained: snapshots.retained,
          maxSnapshots: PostgresRelayAttemptExecutor.maxRetainedQueueMetricSnapshots,
          durability: 'process-memory',
        },
      },
    };
  }
}

function parseLimit(rawValue: string | undefined, fallback: number, max: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestException('Query parameter "limit" must be a positive integer.');
  }

  return Math.min(max, parsed);
}

function parseOffset(rawValue: string | undefined): number {
  if (!rawValue) {
    return 0;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('Query parameter "offset" must be a non-negative integer.');
  }

  return parsed;
}

function parseStatus(rawValue: string | undefined): RelayAttemptQueueStatus | undefined {
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (
    normalized !== 'queued' &&
    normalized !== 'processed' &&
    normalized !== 'retry-scheduled' &&
    normalized !== 'dead-letter'
  ) {
    throw new BadRequestException(
      'Query parameter "status" must be one of: queued, processed, retry-scheduled, dead-letter.',
    );
  }

  return normalized;
}

function parseBooleanQuery(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new BadRequestException('Query parameter "terminalOnly" must be a boolean value.');
}
