import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpException,
  Param,
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
  buildRelayQueueSloTrend,
  deriveRelayQueueReadinessLevel,
  resolveRelayQueueReadinessThresholds,
  resolveRelayQueueSloTrendBucketMinutes,
  resolveRelayQueueSloWindowConfig,
  summarizeRelayQueueSloWindow,
} from '../health/readiness-thresholds';
import {
  createRelayQueueExportHandoff,
  getRelayQueueExportHandoff,
} from './relay-queue-export-handoff';
import { resolveOperatorAccessPolicy } from './operator-access-policy';
import {
  getRelayQueueOperatorTelemetrySnapshot,
  recordRelayQueueOperatorAccess,
} from './relay-queue-telemetry';

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

type QueueAttemptsCsvHandoffQuery = QueueAttemptsCsvQuery;

type QueueAttemptsCsvHandoffPollQuery = {
  download?: string;
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

const relayQueueExportHandoffMaxLimit = 2_000;
const relayQueueExportBatchSize = 100;

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
    await this.assertOperatorAccess('attempts', authorizationHeader);
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'queue inspection requires postgres-persistent relay mode',
          operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
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
          operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
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
        operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
      },
    };
  }

  @Get('attempts.csv')
  async getAttemptsCsv(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueAttemptsCsvQuery,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    await this.assertOperatorAccess('attempts.csv', authorizationHeader);
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

  @Get('attempts.csv/handoff')
  async startAttemptsCsvHandoff(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueAttemptsCsvHandoffQuery,
  ) {
    await this.assertOperatorAccess('attempts.csv/handoff', authorizationHeader);
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      throw new HttpException('CSV export handoff requires postgres-persistent relay mode.', 409);
    }

    const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();

    if (persistenceMode !== 'postgres') {
      throw new HttpException('CSV export handoff requires PERSISTENCE_MODE=postgres.', 409);
    }

    const limit = parseLimit(query.limit, 500, relayQueueExportHandoffMaxLimit);
    const status = parseCsvStatus(query.status);
    const terminalOnly = parseBooleanQuery(query.terminalOnly, true);
    const selectedFields = parseCsvFields(query.fields);

    const handoff = createRelayQueueExportHandoff({
      rowLimit: limit,
      filters: {
        status,
        correlationId: query.correlationId?.trim() || null,
        eventId: query.eventId?.trim() || null,
        terminalOnly,
        fields: selectedFields,
      },
      run: async () => {
        const attempts = await collectQueueAttemptsForCsvExport({
          listAttempts: this.postgresRelayAttemptExecutor.listQueueAttempts.bind(this.postgresRelayAttemptExecutor),
          status,
          limit,
          correlationId: query.correlationId?.trim(),
          eventId: query.eventId?.trim(),
          terminalOnly,
        });

        return toCsv(selectedFields, attempts);
      },
    });

    return {
      service: 'platform-api',
      relayQueue: {
        mode: relayMode,
        enabled: true,
        exportHandoff: {
          id: handoff.id,
          status: handoff.status,
          createdAt: handoff.createdAt,
          expiresAt: handoff.expiresAt,
          rowLimit: handoff.rowLimit,
          filters: handoff.filters,
          pollUrl: `/operators/relay-queue/attempts.csv/handoff/${handoff.id}`,
          downloadUrl: `/operators/relay-queue/attempts.csv/handoff/${handoff.id}?download=1`,
        },
        operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
      },
    };
  }

  @Get('attempts.csv/handoff/:handoffId')
  async getAttemptsCsvHandoff(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Param('handoffId') handoffId: string,
    @Query() query: QueueAttemptsCsvHandoffPollQuery,
    @Res({ passthrough: true }) response: ResponseLike,
  ) {
    await this.assertOperatorAccess('attempts.csv/handoff.poll', authorizationHeader);

    const handoff = getRelayQueueExportHandoff(handoffId);

    if (!handoff) {
      throw new HttpException('CSV export handoff not found or expired.', 404);
    }

    if (query.download && query.download !== '0') {
      if (handoff.status !== 'ready' || !handoff.csv) {
        throw new HttpException('CSV export handoff is not ready yet.', 409);
      }

      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', `attachment; filename="relay-queue-attempts-handoff-${handoff.id}.csv"`);
      return handoff.csv;
    }

    return {
      service: 'platform-api',
      relayQueue: {
        enabled: true,
        exportHandoff: {
          id: handoff.id,
          status: handoff.status,
          createdAt: handoff.createdAt,
          expiresAt: handoff.expiresAt,
          rowLimit: handoff.rowLimit,
          filters: handoff.filters,
          ready: handoff.status === 'ready',
          failed: handoff.status === 'failed',
          error: handoff.error ?? null,
          downloadUrl: `/operators/relay-queue/attempts.csv/handoff/${handoff.id}?download=1`,
        },
        operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
      },
    };
  }

  @Get('snapshots')
  async getSnapshots(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Query() query: QueueSnapshotsQuery,
  ) {
    await this.assertOperatorAccess('snapshots', authorizationHeader);

    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      return {
        service: 'platform-api',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'queue snapshot inspection requires postgres-persistent relay mode',
          operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
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
          operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
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

    const sloSamples = [
      ...sloSnapshots.items.map((snapshot) => ({
        capturedAt: snapshot.capturedAt,
        level: deriveRelayQueueReadinessLevel(snapshot.metrics, thresholds),
      })),
      {
        capturedAt: now.toISOString(),
        level,
      },
    ];

    const sloWindow = summarizeRelayQueueSloWindow({
      now,
      windowMinutes: sloConfig.windowMinutes,
      watchThresholdPercent: sloConfig.watchThresholdPercent,
      criticalThresholdPercent: sloConfig.criticalThresholdPercent,
      samples: sloSamples,
    });

    const sloTrend = buildRelayQueueSloTrend({
      now,
      windowMinutes: sloConfig.windowMinutes,
      bucketMinutes: resolveRelayQueueSloTrendBucketMinutes(process.env),
      watchThresholdPercent: sloConfig.watchThresholdPercent,
      criticalThresholdPercent: sloConfig.criticalThresholdPercent,
      samples: sloSamples,
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
          sloTrend,
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
        operatorAuthTelemetry: getRelayQueueOperatorTelemetrySnapshot(),
      },
    };
  }

  private async assertOperatorAccess(endpoint: string, authorizationHeader: string | undefined): Promise<void> {
    const policy = resolveOperatorAccessPolicy(process.env);

    if (policy.authMode === 'legacy-open') {
      recordRelayQueueOperatorAccess({
        endpoint,
        policy,
        decision: 'legacy-open',
      });
      return;
    }

    const token = extractBearerToken(authorizationHeader);

    if (!token) {
      recordRelayQueueOperatorAccess({
        endpoint,
        policy,
        decision: 'denied-auth',
      });
      throw new HttpException('Operator authentication required.', 401);
    }

    const session = await this.authService.resolveSessionOrNull(token);

    if (!session) {
      recordRelayQueueOperatorAccess({
        endpoint,
        policy,
        decision: 'denied-auth',
      });
      throw new HttpException('Operator authentication required.', 401);
    }

    if (!policy.allowedRoles.includes(session.role)) {
      recordRelayQueueOperatorAccess({
        endpoint,
        policy,
        decision: 'denied-role',
        sessionRole: session.role,
      });
      throw new HttpException('Operator authorization required.', 403);
    }

    recordRelayQueueOperatorAccess({
      endpoint,
      policy,
      decision: 'allowed',
      sessionRole: session.role,
    });
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

async function collectQueueAttemptsForCsvExport(input: {
  listAttempts: (query: {
    limit?: number;
    offset?: number;
    status?: RelayAttemptQueueStatus;
    correlationId?: string;
    eventId?: string;
    terminalOnly?: boolean;
  }) => Promise<{ items: RelayQueueAttemptSummary[]; hasMore: boolean; nextOffset: number | null }>;
  status: RelayAttemptQueueStatus;
  limit: number;
  correlationId?: string;
  eventId?: string;
  terminalOnly: boolean;
}): Promise<RelayQueueAttemptSummary[]> {
  const attempts: RelayQueueAttemptSummary[] = [];
  let offset = 0;

  while (attempts.length < input.limit) {
    const pageSize = Math.min(relayQueueExportBatchSize, input.limit - attempts.length);
    const result = await input.listAttempts({
      limit: pageSize,
      offset,
      status: input.status,
      correlationId: input.correlationId,
      eventId: input.eventId,
      terminalOnly: input.terminalOnly,
    });

    attempts.push(...result.items);

    if (!result.hasMore || result.items.length === 0 || result.nextOffset === null) {
      break;
    }

    offset = result.nextOffset;
  }

  return attempts;
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
