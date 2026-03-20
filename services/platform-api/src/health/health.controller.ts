import { Controller, Get } from '@nestjs/common';

import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { resolveRelayAttemptExecutorMode } from '../orchestration/relay-attempt-executor.provider';

type RelayQueueReadinessLevel = 'good' | 'watch' | 'critical';

@Controller('health')
export class HealthController {
  constructor(private readonly postgresRelayAttemptExecutor: PostgresRelayAttemptExecutor) {}

  @Get()
  getHealth() {
    return {
      service: 'platform-api',
      status: 'bootstrap-ready',
    };
  }

  @Get('readiness')
  async getReadiness() {
    const relayMode = resolveRelayAttemptExecutorMode(process.env);

    if (relayMode !== 'postgres-persistent') {
      return {
        service: 'platform-api',
        status: 'ready',
        relayQueue: {
          mode: relayMode,
          enabled: false,
        },
      };
    }

    const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();

    if (persistenceMode !== 'postgres') {
      return {
        service: 'platform-api',
        status: 'degraded',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: 'postgres-persistent relay mode requires PERSISTENCE_MODE=postgres',
        },
      };
    }

    let metrics;

    try {
      metrics = await this.postgresRelayAttemptExecutor.getQueueMetricsSnapshot();
    } catch (error) {
      return {
        service: 'platform-api',
        status: 'degraded',
        relayQueue: {
          mode: relayMode,
          enabled: false,
          reason: error instanceof Error ? error.message : 'queue metrics unavailable',
        },
      };
    }

    const thresholds = {
      lagWatchMs: 15_000,
      lagCriticalMs: 60_000,
      deadLetterWatchCount: 1,
      deadLetterCriticalCount: 5,
      dueWatchCount: 10,
      dueCriticalCount: 50,
    };

    const level = deriveReadinessLevel(metrics, thresholds);

    return {
      service: 'platform-api',
      status: level === 'critical' ? 'degraded' : 'ready',
      relayQueue: {
        mode: relayMode,
        enabled: true,
        level,
        counters: {
          depth: metrics.depth,
          dueCount: metrics.dueCount,
          deadLetterCount: metrics.deadLetterCount,
        },
        lagMs: metrics.processingLagMs,
        thresholds,
      },
    };
  }
}

function deriveReadinessLevel(
  metrics: {
    dueCount: number;
    deadLetterCount: number;
    processingLagMs: number;
  },
  thresholds: {
    lagWatchMs: number;
    lagCriticalMs: number;
    deadLetterWatchCount: number;
    deadLetterCriticalCount: number;
    dueWatchCount: number;
    dueCriticalCount: number;
  },
): RelayQueueReadinessLevel {
  if (
    metrics.processingLagMs >= thresholds.lagCriticalMs ||
    metrics.deadLetterCount >= thresholds.deadLetterCriticalCount ||
    metrics.dueCount >= thresholds.dueCriticalCount
  ) {
    return 'critical';
  }

  if (
    metrics.processingLagMs >= thresholds.lagWatchMs ||
    metrics.deadLetterCount >= thresholds.deadLetterWatchCount ||
    metrics.dueCount >= thresholds.dueWatchCount
  ) {
    return 'watch';
  }

  return 'good';
}
