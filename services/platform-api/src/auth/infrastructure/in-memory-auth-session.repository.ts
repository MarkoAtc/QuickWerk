import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { computeSessionExpiryIso, isSessionExpired, resolveAuthSessionTtlSeconds } from '../domain/auth-session-expiry';
import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
} from '../domain/auth-session.repository';

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();
  private readonly sessionTtlSeconds = resolveAuthSessionTtlSeconds();

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const token = randomUUID();
    const now = new Date().toISOString();
    const session: AuthSession = {
      createdAt: now,
      expiresAt: computeSessionExpiryIso(now, this.sessionTtlSeconds),
      email: input.email,
      role: input.role,
      token,
      userId: `${input.role}-${token.slice(0, 8)}`,
    };

    this.sessions.set(token, session);

    return session;
  }

  async resolveSession(token: string | null | undefined): Promise<AuthSession | null> {
    if (!token) {
      return null;
    }

    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    if (isSessionExpired(session.expiresAt)) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  async deleteSession(token: string | null | undefined): Promise<boolean> {
    if (!token) {
      return false;
    }

    return this.sessions.delete(token);
  }
}
