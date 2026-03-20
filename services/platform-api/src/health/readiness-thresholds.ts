import type { RelayQueueMetrics } from '../orchestration/relay-attempt-executor';

export type RelayQueueReadinessLevel = 'good' | 'watch' | 'critical';

export type RelayQueueReadinessThresholds = {
  lagWatchMs: number;
  lagCriticalMs: number;
  deadLetterWatchCount: number;
  deadLetterCriticalCount: number;
  depthWatchCount: number;
  depthCriticalCount: number;
  dueWatchCount: number;
  dueCriticalCount: number;
};

const defaultThresholds = {
  lagWatchMs: 15_000,
  lagCriticalMs: 60_000,
  deadLetterWatchCount: 1,
  deadLetterCriticalCount: 5,
  depthWatchCount: 10,
  depthCriticalCount: 50,
} as const;

export function resolveRelayQueueReadinessThresholds(env: NodeJS.ProcessEnv): RelayQueueReadinessThresholds {
  const lagWatchMs = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS,
    defaultThresholds.lagWatchMs,
  );
  const lagCriticalMs = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS,
    defaultThresholds.lagCriticalMs,
  );
  const deadLetterWatchCount = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT,
    defaultThresholds.deadLetterWatchCount,
  );
  const deadLetterCriticalCount = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT,
    defaultThresholds.deadLetterCriticalCount,
  );
  const depthWatchCount = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT,
    defaultThresholds.depthWatchCount,
  );
  const depthCriticalCount = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT,
    defaultThresholds.depthCriticalCount,
  );

  return {
    lagWatchMs,
    lagCriticalMs: Math.max(lagWatchMs, lagCriticalMs),
    deadLetterWatchCount,
    deadLetterCriticalCount: Math.max(deadLetterWatchCount, deadLetterCriticalCount),
    depthWatchCount,
    depthCriticalCount: Math.max(depthWatchCount, depthCriticalCount),
    dueWatchCount: depthWatchCount,
    dueCriticalCount: Math.max(depthWatchCount, depthCriticalCount),
  };
}

export function deriveRelayQueueReadinessLevel(
  metrics: RelayQueueMetrics,
  thresholds: RelayQueueReadinessThresholds,
): RelayQueueReadinessLevel {
  const backlogPressureCount = Math.max(metrics.depth, metrics.dueCount);

  if (
    metrics.processingLagMs >= thresholds.lagCriticalMs ||
    metrics.deadLetterCount >= thresholds.deadLetterCriticalCount ||
    backlogPressureCount >= thresholds.depthCriticalCount
  ) {
    return 'critical';
  }

  if (
    metrics.processingLagMs >= thresholds.lagWatchMs ||
    metrics.deadLetterCount >= thresholds.deadLetterWatchCount ||
    backlogPressureCount >= thresholds.depthWatchCount
  ) {
    return 'watch';
  }

  return 'good';
}

function resolvePositiveInteger(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
