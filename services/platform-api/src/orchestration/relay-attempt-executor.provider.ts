import {
  InMemoryRelayAttemptExecutor,
  QueueBackedRelayAttemptExecutor,
  RelayAttemptExecutor,
} from './relay-attempt-executor';

export type RelayAttemptExecutorMode = 'in-memory' | 'queue-backed';

export const defaultRelayAttemptExecutorMode: RelayAttemptExecutorMode = 'in-memory';

const supportedRelayAttemptExecutorModes: readonly RelayAttemptExecutorMode[] = [
  'in-memory',
  'queue-backed',
];

export function resolveRelayAttemptExecutorMode(
  env: NodeJS.ProcessEnv = process.env,
): RelayAttemptExecutorMode {
  const rawMode = env.BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE?.trim().toLowerCase();

  if (!rawMode) {
    return defaultRelayAttemptExecutorMode;
  }

  if (rawMode === 'in-memory' || rawMode === 'queue-backed') {
    return rawMode;
  }

  throw new Error(
    `Invalid BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE="${rawMode}". Supported values: ${supportedRelayAttemptExecutorModes.join(', ')}.`,
  );
}

export function resolveRelayAttemptExecutor(params: {
  inMemoryExecutor: InMemoryRelayAttemptExecutor;
  queueBackedExecutor: QueueBackedRelayAttemptExecutor;
  env?: NodeJS.ProcessEnv;
}): RelayAttemptExecutor {
  const mode = resolveRelayAttemptExecutorMode(params.env);

  if (mode === 'queue-backed') {
    return params.queueBackedExecutor;
  }

  return params.inMemoryExecutor;
}
