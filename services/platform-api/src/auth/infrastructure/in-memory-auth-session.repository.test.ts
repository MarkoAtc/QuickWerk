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
      role: 'customer',
    });

    await expect(
      repository.registerCustomer({
        name: 'Marta Meister',
        email: 'MARTA@quickwerk.local',
        password: 'supersecure',
        role: 'customer',
      }),
    ).rejects.toThrow('already exists');
  });

  it('registers a provider and preserves the role on a later password sign-in', async () => {
    const repository = new InMemoryAuthSessionRepository();

    const registered = await repository.registerCustomer({
      name: 'Priya Provider',
      email: 'priya@quickwerk.local',
      password: 'supersecure',
      role: 'provider',
    });

    expect(registered.role).toBe('provider');

    const signedIn = await repository.createSession({
      email: 'priya@quickwerk.local',
      password: 'supersecure',
    });

    expect(signedIn.role).toBe('provider');
    expect(signedIn.userId).toBe(registered.userId);
  });

  it('locks out OTP verification after exceeding the attempt cap', async () => {
    const repository = new InMemoryAuthSessionRepository();

    const { devCode } = await repository.requestOtp('+15550001234');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        repository.verifyOtp({ phone: '+15550001234', code: '000000' }),
      ).rejects.toThrow('Invalid or already-used verification code');
    }

    await expect(
      repository.verifyOtp({ phone: '+15550001234', code: devCode as string }),
    ).rejects.toThrow('Invalid or already-used verification code');
  });

  it('single-uses an OTP code — verifying twice fails the second time', async () => {
    const repository = new InMemoryAuthSessionRepository();

    const { devCode } = await repository.requestOtp('+15550001234');
    await repository.verifyOtp({ phone: '+15550001234', code: devCode as string });

    await expect(
      repository.verifyOtp({ phone: '+15550001234', code: devCode as string }),
    ).rejects.toThrow('Invalid or already-used verification code');
  });
});
