import { describe, expect, it } from 'vitest';

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
});
