import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

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
  passwordHash: string;
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
    const normalizedEmail = input.email.toLowerCase();

    if (this.customersByEmail.has(normalizedEmail)) {
      throw new DuplicateEmailError(normalizedEmail);
    }

    const userId = `customer-${randomUUID().slice(0, 8)}`;
    this.customersByEmail.set(normalizedEmail, {
      userId,
      name: input.name,
      email: normalizedEmail,
      passwordHash: await hashPassword(input.password),
    });

    return this.createSession({
      email: normalizedEmail,
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

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}
