import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { InMemoryAuthSessionRepository } from './infrastructure/in-memory-auth-session.repository';

describe('AuthService', () => {
  it('resolves anonymous state when token is missing', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    const session = await service.getSession(undefined);

    expect(session.sessionState).toBe('anonymous');
    expect(session.nextStep).toBe('sign-in');
  });

  it('creates, resolves, and invalidates sessions via sign-in/sign-out', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    const signedIn = await service.signIn({
      email: 'customer@quickwerk.local',
      role: 'customer',
    });

    expect(signedIn.sessionState).toBe('authenticated');
    expect(signedIn.token).toBeTruthy();

    const resolved = await service.getSession(signedIn.token);
    expect(resolved.sessionState).toBe('authenticated');
    if (resolved.sessionState === 'authenticated') {
      expect(resolved.session.email).toBe('customer@quickwerk.local');
      expect(resolved.session.role).toBe('customer');
    }

    const signOut = await service.signOut(signedIn.token);
    expect(signOut.signedOut).toBe(true);

    const afterSignOut = await service.getSession(signedIn.token);
    expect(afterSignOut.sessionState).toBe('anonymous');
  });

  it('accepts dedicated operator session role on sign-in', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    const signedIn = await service.signIn({
      email: 'operator@quickwerk.local',
      role: 'operator',
    });

    expect(signedIn.sessionState).toBe('authenticated');
    if (signedIn.sessionState === 'authenticated') {
      expect(signedIn.session.role).toBe('operator');
    }
  });

  it('registers a customer on sign-up and returns an authenticated session token', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    const signedUp = await service.signUp({
      name: 'Marta Meister',
      email: 'marta@quickwerk.local',
      password: 'supersecure',
    });

    expect(signedUp.sessionState).toBe('authenticated');
    expect(signedUp.token).toBeTruthy();
    if (signedUp.sessionState === 'authenticated') {
      expect(signedUp.session.email).toBe('marta@quickwerk.local');
      expect(signedUp.session.role).toBe('customer');
    }
  });

  it('rejects invalid sign-up payloads', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    await expect(
      service.signUp({
        name: 'A',
        email: 'invalid-email',
        password: 'short',
      }),
    ).rejects.toThrow('Name must include at least 2 characters.');

    await expect(
      service.signUp({
        name: 'Marta Meister',
        email: 'invalid-email',
        password: 'supersecure',
      }),
    ).rejects.toThrow('Email must be a valid address.');

    await expect(
      service.signUp({
        name: 'Marta Meister',
        email: 'marta@quickwerk.local',
        password: 'short',
      }),
    ).rejects.toThrow('Password must include at least 8 characters.');
  });

  it('rejects duplicate email registration attempts', async () => {
    const service = new AuthService(new InMemoryAuthSessionRepository());

    await service.signUp({
      name: 'Marta Meister',
      email: 'marta@quickwerk.local',
      password: 'supersecure',
    });

    await expect(
      service.signUp({
        name: 'Marta Meister',
        email: 'marta@quickwerk.local',
        password: 'supersecure',
      }),
    ).rejects.toThrow('An account with this email already exists.');
  });

  describe('phone + OTP auth', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('requests then verifies an OTP and returns an authenticated session', async () => {
      const service = new AuthService(new InMemoryAuthSessionRepository());

      const requested = await service.requestOtp('+15550001234');
      expect(requested.phone).toBe('+15550001234');
      expect(requested.devOtpCode).toMatch(/^\d{6}$/);

      const verified = await service.verifyOtp({ phone: '+15550001234', code: requested.devOtpCode });

      expect(verified.sessionState).toBe('authenticated');
      expect(verified.token).toBeTruthy();
      if (verified.sessionState === 'authenticated') {
        expect(verified.session.role).toBe('customer');
      }
    });

    it('reuses the same user on repeat OTP verification for the same phone', async () => {
      const service = new AuthService(new InMemoryAuthSessionRepository());

      const first = await service.requestOtp('+15550001234');
      const firstVerified = await service.verifyOtp({ phone: '+15550001234', code: first.devOtpCode });

      vi.useFakeTimers();
      vi.advanceTimersByTime(31_000);

      const second = await service.requestOtp('+15550001234');
      const secondVerified = await service.verifyOtp({ phone: '+15550001234', code: second.devOtpCode });

      if (firstVerified.sessionState === 'authenticated' && secondVerified.sessionState === 'authenticated') {
        expect(secondVerified.session.userId).toBe(firstVerified.session.userId);
      } else {
        throw new Error('expected both verifications to be authenticated');
      }
    });

    it('rejects a malformed phone number', async () => {
      const service = new AuthService(new InMemoryAuthSessionRepository());

      await expect(service.requestOtp('not-a-phone')).rejects.toThrow(
        'Phone must be a valid number in international format, e.g. +15550001234.',
      );
    });

    it('rejects an incorrect verification code', async () => {
      const service = new AuthService(new InMemoryAuthSessionRepository());

      await service.requestOtp('+15550001234');

      await expect(service.verifyOtp({ phone: '+15550001234', code: '000000' })).rejects.toThrow(
        'Invalid or expired verification code.',
      );
    });

    it('rejects a second OTP request within the cooldown window', async () => {
      const service = new AuthService(new InMemoryAuthSessionRepository());

      await service.requestOtp('+15550001234');

      await expect(service.requestOtp('+15550001234')).rejects.toThrow(
        'A verification code was already sent. Please wait before requesting another.',
      );
    });

    it('rejects an expired verification code', async () => {
      vi.useFakeTimers();
      const service = new AuthService(new InMemoryAuthSessionRepository());

      const requested = await service.requestOtp('+15550001234');
      vi.advanceTimersByTime(6 * 60 * 1000);

      await expect(
        service.verifyOtp({ phone: '+15550001234', code: requested.devOtpCode }),
      ).rejects.toThrow('Invalid or expired verification code.');
    });
  });
});
