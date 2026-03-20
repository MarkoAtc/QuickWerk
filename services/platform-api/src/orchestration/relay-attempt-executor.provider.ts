import { resolvePersistenceMode } from '../persistence/persistence-mode';
import {
  InMemoryRelayAttemptExecutor,
  PostgresRelayAttemptExecutor,
  RelayAttemptExecutor,
} from './relay-attempt-executor';

export type RelayAttemptExecutorMode = 'in-memory' | 'postgres-persistent';

export const defaultRelayAttemptExecutorMode: RelayAttemptExecutorMode = 'in-memory';

const supportedRelayAttemptExecutorModes: readonly RelayAttemptExecutorMode[] = [
  'in-memory',
  'postgres-persistent',
];

export function resolveRelayAttemptExecutorMode(
  env: NodeJS.ProcessEnv = process.env,
): RelayAttemptExecutorMode {
  const rawMode = env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE?.trim().toLowerCase();

  if (!rawMode) {
    return defaultRelayAttemptExecutorMode;
  }

  if (rawMode === 'in-memory') {
    return 'in-memory';
  }

  if (rawMode === 'postgres-persistent' || rawMode === 'queue-backed') {
    return 'postgres-persistent';
  }

  throw new Error(
    `Invalid BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE="${rawMode}". Supported values: ${supportedRelayAttemptExecutorModes.join(', ')}.`,
  );
}

export function resolveRelayAttemptExecutor(params: {
  inMemoryExecutor: InMemoryRelayAttemptExecutor;
  postgresPersistentExecutor: PostgresRelayAttemptExecutor;
  env?: NodeJS.ProcessEnv;
}): RelayAttemptExecutor {
  const env = params.env ?? process.env;
  const mode = resolveRelayAttemptExecutorMode(env);

  if (mode === 'postgres-persistent') {
    const persistenceMode = resolvePersistenceMode(env);

    if (persistenceMode !== 'postgres') {
      throw new Error(
        'BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent requires PERSISTENCE_MODE=postgres.',
      );
    }

    return params.postgresPersistentExecutor;
  }

  return params.inMemoryExecutor;
}
