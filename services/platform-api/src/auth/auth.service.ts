import { Injectable } from '@nestjs/common';

import { AuthSession, SessionRole, SessionStoreService } from './session-store.service';

const publicAuthActions = ['sign-in', 'sign-up', 'password-reset'] as const;

@Injectable()
export class AuthService {
  constructor(private readonly sessionStore: SessionStoreService) {}

  getSession(token: string | undefined) {
    const session = this.sessionStore.resolveSession(token);

    if (!session) {
      return {
        resource: 'auth-session',
        sessionState: 'anonymous',
        availableActions: publicAuthActions,
        nextStep: 'sign-in',
      } as const;
    }

    return {
      resource: 'auth-session',
      sessionState: 'authenticated',
      availableActions: publicAuthActions,
      nextStep: 'sign-in',
      session: {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
    } as const;
  }

  signIn(input: { email?: string; role?: string }) {
    const session = this.sessionStore.createSession({
      email: input.email?.trim() || 'demo.customer@quickwerk.local',
      role: this.resolveRole(input.role),
    });

    return {
      ...this.getSession(session.token),
      token: session.token,
    } as const;
  }

  signOut(token: string | undefined) {
    const signedOut = this.sessionStore.deleteSession(token);

    return {
      resource: 'auth-session',
      signedOut,
      sessionState: 'anonymous',
      availableActions: publicAuthActions,
      nextStep: 'sign-in',
    } as const;
  }

  resolveSessionOrNull(token: string | undefined): AuthSession | null {
    return this.sessionStore.resolveSession(token);
  }

  private resolveRole(role: string | undefined): SessionRole {
    return role === 'provider' ? 'provider' : 'customer';
  }
}
