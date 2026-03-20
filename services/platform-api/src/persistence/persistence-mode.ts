export type PersistenceMode = 'in-memory' | 'postgres';

export const defaultPersistenceMode: PersistenceMode = 'in-memory';

const supportedPersistenceModes: readonly PersistenceMode[] = ['in-memory', 'postgres'];

export function resolvePersistenceMode(env: NodeJS.ProcessEnv = process.env): PersistenceMode {
  const rawMode = env.PERSISTENCE_MODE?.trim().toLowerCase();

  if (!rawMode) {
    return defaultPersistenceMode;
  }

  if (rawMode === 'in-memory' || rawMode === 'postgres') {
    return rawMode;
  }

  throw new Error(
    `Invalid PERSISTENCE_MODE="${rawMode}". Supported values: ${supportedPersistenceModes.join(', ')}.`,
  );
}

export type PostgresPersistenceConfig = {
  databaseUrl: string;
};

export function requirePostgresPersistenceConfig(
  env: NodeJS.ProcessEnv = process.env,
): PostgresPersistenceConfig {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('PERSISTENCE_MODE=postgres requires DATABASE_URL to be set.');
  }

  return {
    databaseUrl,
  };
}
