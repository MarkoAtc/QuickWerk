import { describe, expect, it } from 'vitest';

import {
  InMemoryRelayAttemptExecutor,
  PostgresRelayAttemptExecutor,
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

  it('accepts postgres persistent mode when explicitly set', () => {
    expect(
      resolveRelayAttemptExecutorMode({ BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'postgres-persistent' }),
    ).toBe('postgres-persistent');
  });

  it('accepts legacy queue-backed alias as postgres persistent mode', () => {
    expect(
      resolveRelayAttemptExecutorMode({ BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'queue-backed' }),
    ).toBe('postgres-persistent');
  });

  it('rejects unsupported mode values', () => {
    expect(() =>
      resolveRelayAttemptExecutorMode({ BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'redis' }),
    ).toThrow('Invalid BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE');
  });

  it('resolves in-memory adapter by default', () => {
    const inMemoryExecutor = new InMemoryRelayAttemptExecutor();
    const postgresPersistentExecutor = new PostgresRelayAttemptExecutor({} as never);

    const resolved = resolveRelayAttemptExecutor({
      inMemoryExecutor,
      postgresPersistentExecutor,
      env: {},
    });

    expect(resolved).toBe(inMemoryExecutor);
  });

  it('resolves persistent adapter when mode is enabled in postgres persistence mode', () => {
    const inMemoryExecutor = new InMemoryRelayAttemptExecutor();
    const postgresPersistentExecutor = new PostgresRelayAttemptExecutor({} as never);

    const resolved = resolveRelayAttemptExecutor({
      inMemoryExecutor,
      postgresPersistentExecutor,
      env: {
        BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'postgres-persistent',
        PERSISTENCE_MODE: 'postgres',
      },
    });

    expect(resolved).toBe(postgresPersistentExecutor);
  });

  it('fails fast when persistent adapter mode is enabled without postgres persistence', () => {
    const inMemoryExecutor = new InMemoryRelayAttemptExecutor();
    const postgresPersistentExecutor = new PostgresRelayAttemptExecutor({} as never);

    expect(() =>
      resolveRelayAttemptExecutor({
        inMemoryExecutor,
        postgresPersistentExecutor,
        env: {
          BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE: 'postgres-persistent',
          PERSISTENCE_MODE: 'in-memory',
        },
      }),
    ).toThrow('requires PERSISTENCE_MODE=postgres');
  });
});
