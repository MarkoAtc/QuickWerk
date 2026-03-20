import { describe, expect, it } from 'vitest';

import {
  defaultPersistenceMode,
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from './persistence-mode';

describe('persistence mode config', () => {
  it('defaults to in-memory mode', () => {
    expect(resolvePersistenceMode({})).toBe(defaultPersistenceMode);
  });

  it('accepts postgres mode when explicitly set', () => {
    expect(resolvePersistenceMode({ PERSISTENCE_MODE: 'postgres' })).toBe('postgres');
  });

  it('rejects unsupported persistence mode values', () => {
    expect(() => resolvePersistenceMode({ PERSISTENCE_MODE: 'sqlite' })).toThrow(
      'Invalid PERSISTENCE_MODE',
    );
  });

  it('requires DATABASE_URL when postgres mode is selected', () => {
    expect(() => requirePostgresPersistenceConfig({})).toThrow(
      'PERSISTENCE_MODE=postgres requires DATABASE_URL to be set.',
    );
  });
});
