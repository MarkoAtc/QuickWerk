import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { resolveAuthSessionTtlSeconds } from '../domain/auth-session-expiry';
import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
  DuplicateEmailError,
  RegisterCustomerInput,
} from '../domain/auth-session.repository';
import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';

type SessionRow = {
  token: string;
  user_id: string;
  created_at: Date | string;
  expires_at: Date | string;
  email: string;
  role: 'customer' | 'provider' | 'operator';
};

export class PostgresAuthSessionRepository implements AuthSessionRepository {
  private readonly sessionTtlSeconds = resolveAuthSessionTtlSeconds();

  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly postgresConfig: PostgresPersistenceConfig,
  ) {}

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const userId = randomUUID();
    const token = randomUUID();

    await this.postgresClient.query(
      this.postgresConfig,
      `INSERT INTO users (id, email, role)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET role = EXCLUDED.role`,
      [userId, input.email, input.role],
    );

    const sessionResult = await this.postgresClient.query<SessionRow>(
      this.postgresConfig,
      `INSERT INTO sessions (token, user_id, expires_at)
       SELECT $1::uuid,
              users.id,
              NOW() + make_interval(secs => $3::int)
       FROM users
       WHERE users.email = $2
       RETURNING token::text, user_id::text, created_at, expires_at`,
      [token, input.email, this.sessionTtlSeconds],
    );

    const row = sessionResult.rows[0];

    if (!row) {
      throw new Error('Failed to create auth session in postgres repository.');
    }

    return {
      createdAt: toIsoString(row.created_at),
      expiresAt: toIsoString(row.expires_at),
      email: input.email,
      role: input.role,
      token: row.token,
      userId: row.user_id,
    };
  }

  async registerCustomer(input: RegisterCustomerInput): Promise<AuthSession> {
    const userId = randomUUID();
    const token = randomUUID();
    const normalizedEmail = input.email.toLowerCase();
    const passwordHash = await hashPassword(input.password);

    const userResult = await this.postgresClient.query<{ id: string }>(
      this.postgresConfig,
      `INSERT INTO users (id, email, role, full_name, password_hash)
       VALUES ($1::uuid, $2, 'customer', $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id::text`,
      [userId, normalizedEmail, input.name, passwordHash],
    );

    const createdUser = userResult.rows[0];

    if (!createdUser) {
      throw new DuplicateEmailError(normalizedEmail);
    }

    const sessionResult = await this.postgresClient.query<SessionRow>(
      this.postgresConfig,
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1::uuid, $2::uuid, NOW() + make_interval(secs => $3::int))
       RETURNING token::text, user_id::text, created_at, expires_at`,
      [token, createdUser.id, this.sessionTtlSeconds],
    );

    const row = sessionResult.rows[0];

    if (!row) {
      throw new Error('Failed to create auth session during customer registration.');
    }

    return {
      createdAt: toIsoString(row.created_at),
      expiresAt: toIsoString(row.expires_at),
      email: normalizedEmail,
      role: 'customer',
      token: row.token,
      userId: row.user_id,
    };
  }

  async resolveSession(token: string | null | undefined): Promise<AuthSession | null> {
    if (!token || !isUuid(token)) {
      return null;
    }

    await this.postgresClient.query(
      this.postgresConfig,
      `DELETE FROM sessions
       WHERE token = $1::uuid
         AND expires_at <= NOW()`,
      [token],
    );

    const result = await this.postgresClient.query<SessionRow>(
      this.postgresConfig,
      `SELECT s.token::text,
              s.user_id::text,
              s.created_at,
              s.expires_at,
              u.email,
              u.role
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = $1::uuid
         AND s.expires_at > NOW()
       LIMIT 1`,
      [token],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      createdAt: toIsoString(row.created_at),
      expiresAt: toIsoString(row.expires_at),
      email: row.email,
      role: row.role,
      token: row.token,
      userId: row.user_id,
    };
  }

  async deleteSession(token: string | null | undefined): Promise<boolean> {
    if (!token || !isUuid(token)) {
      return false;
    }

    const result = await this.postgresClient.query(
      this.postgresConfig,
      'DELETE FROM sessions WHERE token = $1::uuid',
      [token],
    );

    return (result.rowCount ?? 0) > 0;
  }
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}
