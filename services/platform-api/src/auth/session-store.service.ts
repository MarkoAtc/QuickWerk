import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type SessionRole = 'customer' | 'provider';

export type AuthSession = {
  createdAt: string;
  email: string;
  role: SessionRole;
  token: string;
  userId: string;
};

@Injectable()
export class SessionStoreService {
  private readonly sessions = new Map<string, AuthSession>();

  createSession(input: { email: string; role: SessionRole }): AuthSession {
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

  resolveSession(token: string | null | undefined): AuthSession | null {
    if (!token) {
      return null;
    }

    return this.sessions.get(token) ?? null;
  }

  deleteSession(token: string | null | undefined): boolean {
    if (!token) {
      return false;
    }

    return this.sessions.delete(token);
  }
}
