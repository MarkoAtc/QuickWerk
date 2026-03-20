import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpException,
  Query,
  Res,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { extractBearerToken } from '../http/auth-header';
import {
  PostgresRelayAttemptExecutor,
  type RelayAttemptQueueStatus,
  type RelayQueueAttemptSummary,
} from '../orchestration/relay-attempt-executor';
import { resolveRelayAttemptExecutorMode } from '../orchestration/relay-attempt-executor.provider';
import {
  deriveRelayQueueReadinessLevel,
  resolveRelayQueueReadinessThresholds,
  resolveRelayQueueSloWindowConfig,
  summarizeRelayQueueSloWindow,
} from '../health/readiness-thresholds';
import { resolveOperatorAccessPolicy } from './operator-access-policy';

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

type QueueAttemptsCsvQuery = {
  limit?: string;
  status?: string;
  correlationId?: string;
  eventId?: string;
  terminalOnly?: string;
  fields?: string;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

const allowedCsvFields = [
  'id',
  'eventId',
  'correlationId',
  'attempt',
  'maxAttempts',
  'status',
  'nextAttemptAt',
  'terminalMarker',
  'createdAt',
  'updatedAt',
  'processedAt',
] as const;

type AllowedCsvField = (typeof allowedCsvFields)[number];

@Controller('operators/relay-queue')
export class RelayQueueOperatorController {
  constructor(
    private readonly authService: AuthService,
    private readonly postgresRelayAttemptExecutor: PostgresRelayAttemptExecutor,
  ) {}

  @Get('attempts')
  async getAttempts(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueAttemptsQuery,
  ) {
    await this.assertOperatorAccess(authorizationHeader);
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

  @Get('attempts.csv')
  async getAttemptsCsv(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueAttemptsCsvQuery,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    await this.assertOperatorAccess(authorizationHeader);
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      throw new HttpException('CSV export requires postgres-persistent relay mode.', 409);
    }

    const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();

    if (persistenceMode !== 'postgres') {
      throw new HttpException('CSV export requires PERSISTENCE_MODE=postgres.', 409);
    }

    const limit = parseLimit(query.limit, 50, 100);
    const status = parseCsvStatus(query.status);
    const terminalOnly = parseBooleanQuery(query.terminalOnly, true);
    const selectedFields = parseCsvFields(query.fields);

    const attempts = await this.postgresRelayAttemptExecutor.listQueueAttempts({
      limit,
      offset: 0,
      status,
      correlationId: query.correlationId?.trim(),
      eventId: query.eventId?.trim(),
      terminalOnly,
    });

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="relay-queue-attempts-${new Date().toISOString()}.csv"`);

    return toCsv(selectedFields, attempts.items);
  }

  @Get('snapshots')
  async getSnapshots(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueSnapshotsQuery,
  ) {
    await this.assertOperatorAccess(authorizationHeader);

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
    const snapshots = await this.postgresRelayAttemptExecutor.listQueueMetricSnapshots({
      limit,
      offset,
      correlationId,
    });
    const current = await this.postgresRelayAttemptExecutor.getQueueMetricsSnapshot();
    const thresholds = resolveRelayQueueReadinessThresholds(process.env);
    const level = deriveRelayQueueReadinessLevel(current, thresholds);
    const now = new Date();
    const sloConfig = resolveRelayQueueSloWindowConfig(process.env);
    const sinceCapturedAt = new Date(now.getTime() - sloConfig.windowMinutes * 60_000).toISOString();

    const sloSnapshots = await this.postgresRelayAttemptExecutor.listQueueMetricSnapshots({
      limit: sloConfig.sampleLimit,
      offset: 0,
      sinceCapturedAt,
    });

    const sloWindow = summarizeRelayQueueSloWindow({
      now,
      windowMinutes: sloConfig.windowMinutes,
      watchThresholdPercent: sloConfig.watchThresholdPercent,
      criticalThresholdPercent: sloConfig.criticalThresholdPercent,
      samples: [
        ...sloSnapshots.items.map((snapshot) => ({
          capturedAt: snapshot.capturedAt,
          level: deriveRelayQueueReadinessLevel(snapshot.metrics, thresholds),
        })),
        {
          capturedAt: now.toISOString(),
          level,
        },
      ],
    });

    return {
      service: 'platform-api',
      relayQueue: {
        mode: relayMode,
        enabled: true,
        current: {
          capturedAt: now.toISOString(),
          level,
          metrics: current,
          thresholds,
          sloWindow,
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
          maxSnapshots: PostgresRelayAttemptExecutor.resolveQueueMetricSnapshotRetention(process.env),
          durability: 'postgres-table',
        },
      },
    };
  }

  private async assertOperatorAccess(authorizationHeader: string | undefined): Promise<void> {
    const policy = resolveOperatorAccessPolicy(process.env);

    if (policy.authMode === 'legacy-open') {
      return;
    }

    const token = extractBearerToken(authorizationHeader);

    if (!token) {
      throw new HttpException('Operator authentication required.', 401);
    }

    const session = await this.authService.resolveSessionOrNull(token);

    if (!session) {
      throw new HttpException('Operator authentication required.', 401);
    }

    if (!policy.allowedRoles.includes(session.role)) {
      throw new HttpException('Operator authorization required.', 403);
    }
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

function parseCsvStatus(rawValue: string | undefined): RelayAttemptQueueStatus {
  if (!rawValue) {
    return 'dead-letter';
  }

  const parsed = parseStatus(rawValue);

  if (parsed !== 'dead-letter') {
    throw new BadRequestException('CSV export only supports status=dead-letter.');
  }

  return parsed;
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

function parseCsvFields(rawValue: string | undefined): AllowedCsvField[] {
  if (!rawValue) {
    return ['id', 'eventId', 'correlationId', 'attempt', 'maxAttempts', 'status', 'processedAt'];
  }

  const requested = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is AllowedCsvField =>
      (allowedCsvFields as readonly string[]).includes(value),
    );

  const deduped = [...new Set(requested)];

  if (deduped.length === 0) {
    throw new BadRequestException(`Query parameter "fields" must include any of: ${allowedCsvFields.join(', ')}.`);
  }

  return deduped;
}

function toCsv(fields: AllowedCsvField[], attempts: RelayQueueAttemptSummary[]): string {
  const lines: string[] = [fields.join(',')];

  for (const attempt of attempts) {
    const row = fields.map((field) => escapeCsvValue(attempt[field]));
    lines.push(row.join(','));
  }

  return `${lines.join('\n')}\n`;
}

function escapeCsvValue(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);

  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
}
