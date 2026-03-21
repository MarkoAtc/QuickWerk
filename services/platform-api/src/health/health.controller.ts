import { Controller, Get } from '@nestjs/common';

import { PostgresRelayAttemptExecutor } from '../orchestration/relay-attempt-executor';
import { resolveRelayAttemptExecutorMode } from '../orchestration/relay-attempt-executor.provider';
import {
  deriveRelayQueueReadinessLevel,
  resolveRelayQueueReadinessThresholds,
  resolveRelayQueueSloWindowConfig,
  summarizeRelayQueueSloWindow,
} from './readiness-thresholds';

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

    const thresholds = resolveRelayQueueReadinessThresholds(process.env);
    const level = deriveRelayQueueReadinessLevel(metrics, thresholds);
    const now = new Date();
    const sloConfig = resolveRelayQueueSloWindowConfig(process.env);
    const sinceCapturedAt = new Date(now.getTime() - sloConfig.windowMinutes * 60_000).toISOString();

    let sloWindow = summarizeRelayQueueSloWindow({
      now,
      windowMinutes: sloConfig.windowMinutes,
      watchThresholdPercent: sloConfig.watchThresholdPercent,
      criticalThresholdPercent: sloConfig.criticalThresholdPercent,
      samples: [
        {
          capturedAt: now.toISOString(),
          level,
        },
      ],
    });

    try {
      const snapshots = await this.postgresRelayAttemptExecutor.listQueueMetricSnapshots({
        limit: sloConfig.sampleLimit,
        offset: 0,
        sinceCapturedAt,
      });

      const samples = [
        ...snapshots.items.map((snapshot) => ({
          capturedAt: snapshot.capturedAt,
          level: deriveRelayQueueReadinessLevel(snapshot.metrics, thresholds),
        })),
        {
          capturedAt: now.toISOString(),
          level,
        },
      ];

      sloWindow = summarizeRelayQueueSloWindow({
        now,
        windowMinutes: sloConfig.windowMinutes,
        watchThresholdPercent: sloConfig.watchThresholdPercent,
        criticalThresholdPercent: sloConfig.criticalThresholdPercent,
        samples,
      });
    } catch {
      // keep default insufficient-data placeholder to avoid changing readiness availability semantics
    }

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
        sloWindow,
      },
    };
  }
}
