import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { computeSessionExpiryIso, isSessionExpired, resolveAuthSessionTtlSeconds } from '../domain/auth-session-expiry';
import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
  DuplicateEmailError,
  RegisterCustomerInput,
} from '../domain/auth-session.repository';

type RegisteredCustomer = {
  userId: string;
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();
  private readonly customersByEmail = new Map<string, RegisteredCustomer>();
  private readonly sessionTtlSeconds = resolveAuthSessionTtlSeconds();

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const token = randomUUID();
    const now = new Date().toISOString();
    const registeredCustomer = input.role === 'customer' ? this.customersByEmail.get(input.email) : undefined;
    const session: AuthSession = {
      createdAt: now,
      expiresAt: computeSessionExpiryIso(now, this.sessionTtlSeconds),
      email: input.email,
      role: input.role,
      token,
      userId: registeredCustomer?.userId ?? `${input.role}-${token.slice(0, 8)}`,
    };

    this.sessions.set(token, session);

    return session;
  }

  async registerCustomer(input: RegisterCustomerInput): Promise<AuthSession> {
    if (this.customersByEmail.has(input.email)) {
      throw new DuplicateEmailError(input.email);
    }

    const userId = `customer-${randomUUID().slice(0, 8)}`;
    this.customersByEmail.set(input.email, {
      userId,
      name: input.name,
      email: input.email,
      password: input.password,
    });

    return this.createSession({
      email: input.email,
      role: 'customer',
    });
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
