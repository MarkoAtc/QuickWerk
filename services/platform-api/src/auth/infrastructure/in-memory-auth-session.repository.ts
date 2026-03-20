import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
} from '../domain/auth-session.repository';

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const token = randomUUID();
    const now = new Date().toISOString();
    const session: AuthSession = {
      createdAt: now,
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

    return this.sessions.get(token) ?? null;
  }

  async deleteSession(token: string | null | undefined): Promise<boolean> {
    if (!token) {
      return false;
    }

    return this.sessions.delete(token);
  }
}
