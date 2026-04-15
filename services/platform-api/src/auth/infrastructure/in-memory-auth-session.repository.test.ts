import { describe, expect, it, vi } from 'vitest';

import { InMemoryAuthSessionRepository } from './in-memory-auth-session.repository';

describe('InMemoryAuthSessionRepository', () => {
  it('creates and resolves active sessions', async () => {
    const repository = new InMemoryAuthSessionRepository();

    const session = await repository.createSession({
      email: 'customer@quickwerk.local',
      role: 'customer',
    });

    const resolved = await repository.resolveSession(session.token);

    expect(resolved?.token).toBe(session.token);
    expect(resolved?.expiresAt).toBeTruthy();
  });

  it('invalidates expired sessions during resolve', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T10:00:00.000Z'));

    const repository = new InMemoryAuthSessionRepository();
    const session = await repository.createSession({
      email: 'customer@quickwerk.local',
      role: 'customer',
    });

    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));

    await expect(repository.resolveSession(session.token)).resolves.toBeNull();
    await expect(repository.resolveSession(session.token)).resolves.toBeNull();

    vi.useRealTimers();
  });

  it('rejects duplicate customer registration emails', async () => {
    const repository = new InMemoryAuthSessionRepository();

    await repository.registerCustomer({
      name: 'Marta Meister',
      email: 'marta@quickwerk.local',
      password: 'supersecure',
    });

    await expect(
      repository.registerCustomer({
        name: 'Marta Meister',
        email: 'MARTA@quickwerk.local',
        password: 'supersecure',
      }),
    ).rejects.toThrow('already exists');
  });
});
