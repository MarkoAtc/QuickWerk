import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { PostgresRelayAttemptExecutor } from './relay-attempt-executor';
import { resolveRelayAttemptExecutorMode } from './relay-attempt-executor.provider';

const defaultTickIntervalMs = 1000;

@Injectable()
export class RelayQueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(private readonly postgresRelayAttemptExecutor: PostgresRelayAttemptExecutor) {}

  onModuleInit(): void {
    if (!isPostgresPersistentRelayWorkerEnabled(process.env)) {
      return;
    }

    const tickIntervalMs = parsePositiveInteger(
      process.env.BOOKING_ACCEPTED_RELAY_QUEUE_TICK_MS,
      defaultTickIntervalMs,
    );

    this.timer = setInterval(() => {
      void this.tick();
    }, tickIntervalMs);

    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  async tick(input?: { now?: Date; maxDrains?: number }): Promise<{ drainedCount: number; skipped: boolean }> {
    if (!isPostgresPersistentRelayWorkerEnabled(process.env)) {
      return {
        drainedCount: 0,
        skipped: true,
      };
    }

    if (this.inFlight) {
      return {
        drainedCount: 0,
        skipped: true,
      };
    }

    this.inFlight = true;

    try {
      const maxDrains = parsePositiveInteger(
        process.env.BOOKING_ACCEPTED_RELAY_QUEUE_MAX_DRAINS,
        PostgresRelayAttemptExecutor.defaultMaxDueRetryDrainsPerTick,
      );
      const result = await this.postgresRelayAttemptExecutor.drainDueRetriesTick({
        now: input?.now,
        maxDrains: input?.maxDrains ?? maxDrains,
      });

      if (result.drainedCount > 0) {
        logStructuredBreadcrumb({
          event: 'booking.accepted.domain-event.relay.queue.tick',
          correlationId: 'corr-relay-queue-worker',
          status: 'started',
          details: {
            drainedCount: result.drainedCount,
          },
        });
      }

      return {
        drainedCount: result.drainedCount,
        skipped: false,
      };
    } finally {
      this.inFlight = false;
    }
  }
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isPostgresPersistentRelayWorkerEnabled(env: NodeJS.ProcessEnv): boolean {
  const relayMode = resolveRelayAttemptExecutorMode(env);
  const persistenceMode = env.PERSISTENCE_MODE?.trim().toLowerCase();

  return relayMode === 'postgres-persistent' && persistenceMode === 'postgres';
}
