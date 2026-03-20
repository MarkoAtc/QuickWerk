import { describe, expect, it } from 'vitest';

import {
  InMemoryRelayAttemptExecutor,
  QueueBackedRelayAttemptExecutor,
} from './relay-attempt-executor';
import {
  defaultRelayAttemptExecutorMode,
  resolveRelayAttemptExecutor,
  resolveRelayAttemptExecutorMode,
} from './relay-attempt-executor.provider';

describe('relay attempt executor provider', () => {
  it('defaults to in-memory mode', () => {
    expect(resolveRelayAttemptExecutorMode({})).toBe(defaultRelayAttemptExecutorMode);
  });

  it('accepts queue-backed mode when explicitly set', () => {
    expect(
      resolveRelayAttemptExecutorMode({ BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'queue-backed' }),
    ).toBe('queue-backed');
  });

  it('rejects unsupported mode values', () => {
    expect(() =>
      resolveRelayAttemptExecutorMode({ BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'redis' }),
    ).toThrow('Invalid BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE');
  });

  it('resolves in-memory adapter by default', () => {
    const inMemoryExecutor = new InMemoryRelayAttemptExecutor();
    const queueBackedExecutor = new QueueBackedRelayAttemptExecutor();

    const resolved = resolveRelayAttemptExecutor({
      inMemoryExecutor,
      queueBackedExecutor,
      env: {},
    });

    expect(resolved).toBe(inMemoryExecutor);
  });

  it('resolves queue-backed adapter when mode is enabled', () => {
    const inMemoryExecutor = new InMemoryRelayAttemptExecutor();
    const queueBackedExecutor = new QueueBackedRelayAttemptExecutor();

    const resolved = resolveRelayAttemptExecutor({
      inMemoryExecutor,
      queueBackedExecutor,
      env: { BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'queue-backed' },
    });

    expect(resolved).toBe(queueBackedExecutor);
  });
});
