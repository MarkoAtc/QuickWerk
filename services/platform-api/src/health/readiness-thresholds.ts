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

export type RelayQueueSloWindowConfig = {
  windowMinutes: number;
  sampleLimit: number;
  watchThresholdPercent: number;
  criticalThresholdPercent: number;
};

export type RelayQueueSloWindowSummary = {
  windowMinutes: number;
  observedSeconds: number;
  sampleCount: number;
  stateSeconds: {
    good: number;
    watch: number;
    critical: number;
  };
  stateRatios: {
    good: number;
    watch: number;
    critical: number;
  };
  thresholds: {
    watchPercent: number;
    criticalPercent: number;
  };
  status: 'good' | 'watch' | 'critical' | 'insufficient-data';
};

const defaultThresholds = {
  lagWatchMs: 15_000,
  lagCriticalMs: 60_000,
  deadLetterWatchCount: 1,
  deadLetterCriticalCount: 5,
  depthWatchCount: 10,
  depthCriticalCount: 50,
} as const;

const defaultSloWindowConfig = {
  windowMinutes: 30,
  sampleLimit: 240,
  watchThresholdPercent: 20,
  criticalThresholdPercent: 5,
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

export function resolveRelayQueueSloWindowConfig(env: NodeJS.ProcessEnv): RelayQueueSloWindowConfig {
  const windowMinutes = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES,
    defaultSloWindowConfig.windowMinutes,
  );
  const sampleLimit = resolvePositiveInteger(
    env.BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT,
    defaultSloWindowConfig.sampleLimit,
  );
  const watchThresholdPercent = resolvePercent(
    env.BOOKING_ACCEPTED_RELAY_SLO_WATCH_THRESHOLD_PERCENT,
    defaultSloWindowConfig.watchThresholdPercent,
  );
  const criticalThresholdPercent = resolvePercent(
    env.BOOKING_ACCEPTED_RELAY_SLO_CRITICAL_THRESHOLD_PERCENT,
    defaultSloWindowConfig.criticalThresholdPercent,
  );

  return {
    windowMinutes: Math.min(24 * 60, windowMinutes),
    sampleLimit: Math.min(1_000, sampleLimit),
    watchThresholdPercent,
    criticalThresholdPercent: Math.min(watchThresholdPercent, criticalThresholdPercent),
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

export function summarizeRelayQueueSloWindow(input: {
  now: Date;
  windowMinutes: number;
  watchThresholdPercent: number;
  criticalThresholdPercent: number;
  samples: Array<{ capturedAt: string; level: RelayQueueReadinessLevel }>;
}): RelayQueueSloWindowSummary {
  const windowStartMs = input.now.getTime() - input.windowMinutes * 60_000;
  const ordered = [...input.samples]
    .map((sample) => ({ ...sample, capturedAtMs: new Date(sample.capturedAt).getTime() }))
    .filter((sample) => Number.isFinite(sample.capturedAtMs))
    .sort((left, right) => left.capturedAtMs - right.capturedAtMs)
    .filter((sample) => sample.capturedAtMs >= windowStartMs);

  if (ordered.length < 2) {
    return {
      windowMinutes: input.windowMinutes,
      observedSeconds: 0,
      sampleCount: ordered.length,
      stateSeconds: {
        good: 0,
        watch: 0,
        critical: 0,
      },
      stateRatios: {
        good: 0,
        watch: 0,
        critical: 0,
      },
      thresholds: {
        watchPercent: input.watchThresholdPercent,
        criticalPercent: input.criticalThresholdPercent,
      },
      status: 'insufficient-data',
    };
  }

  const stateSeconds: Record<RelayQueueReadinessLevel, number> = {
    good: 0,
    watch: 0,
    critical: 0,
  };

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];

    if (!current || !next) {
      continue;
    }

    const segmentSeconds = Math.max(0, (next.capturedAtMs - current.capturedAtMs) / 1000);
    stateSeconds[current.level] += segmentSeconds;
  }

  const observedSeconds = Math.max(
    0,
    ((ordered[ordered.length - 1]?.capturedAtMs ?? 0) - (ordered[0]?.capturedAtMs ?? 0)) / 1000,
  );

  if (observedSeconds <= 0) {
    return {
      windowMinutes: input.windowMinutes,
      observedSeconds: 0,
      sampleCount: ordered.length,
      stateSeconds: {
        good: 0,
        watch: 0,
        critical: 0,
      },
      stateRatios: {
        good: 0,
        watch: 0,
        critical: 0,
      },
      thresholds: {
        watchPercent: input.watchThresholdPercent,
        criticalPercent: input.criticalThresholdPercent,
      },
      status: 'insufficient-data',
    };
  }

  const watchRatio = ((stateSeconds.watch + stateSeconds.critical) / observedSeconds) * 100;
  const criticalRatio = (stateSeconds.critical / observedSeconds) * 100;
  const goodRatio = (stateSeconds.good / observedSeconds) * 100;

  const status =
    criticalRatio >= input.criticalThresholdPercent
      ? 'critical'
      : watchRatio >= input.watchThresholdPercent
        ? 'watch'
        : 'good';

  return {
    windowMinutes: input.windowMinutes,
    observedSeconds: Math.round(observedSeconds),
    sampleCount: ordered.length,
    stateSeconds: {
      good: Math.round(stateSeconds.good),
      watch: Math.round(stateSeconds.watch),
      critical: Math.round(stateSeconds.critical),
    },
    stateRatios: {
      good: roundRatio(goodRatio),
      watch: roundRatio(watchRatio),
      critical: roundRatio(criticalRatio),
    },
    thresholds: {
      watchPercent: input.watchThresholdPercent,
      criticalPercent: input.criticalThresholdPercent,
    },
    status,
  };
}

function resolvePositiveInteger(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function resolvePercent(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(rawValue ?? '');

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return fallback;
  }

  return parsed;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}
