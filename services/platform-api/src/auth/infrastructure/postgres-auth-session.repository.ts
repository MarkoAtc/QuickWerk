import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';

import { resolveAuthSessionTtlSeconds } from '../domain/auth-session-expiry';
import {
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
  DuplicateEmailError,
  InvalidOtpError,
  OtpExpiredError,
  OtpRequestCooldownError,
  PasswordAuthSessionInput,
  RegisterCustomerInput,
  RequestOtpResult,
  SessionRole,
  VerifyOtpInput,
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
    const normalizedEmail = input.email.toLowerCase();

    if (isPasswordAuthInput(input)) {
      const userResult = await this.postgresClient.query<{ id: string; password_hash: string | null; role: string }>(
        this.postgresConfig,
        `SELECT id::text, password_hash, role FROM users WHERE email = $1`,
        [normalizedEmail],
      );

      const user = userResult.rows[0];

      if (!user || !user.password_hash) {
        throw new Error('Invalid email or password.');
      }

      const isValidPassword = await verifyPassword(input.password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Invalid email or password.');
      }

      // Create session for authenticated user
      const sessionResult = await this.postgresClient.query<SessionRow>(
        this.postgresConfig,
        `INSERT INTO sessions (token, user_id, expires_at)
         VALUES ($1::uuid, $2::uuid, NOW() + make_interval(secs => $3::int))
         RETURNING token::text, user_id::text, created_at, expires_at`,
        [token, user.id, this.sessionTtlSeconds],
      );

      const row = sessionResult.rows[0];

      if (!row) {
        throw new Error('Failed to create auth session in postgres repository.');
      }

      return {
        createdAt: toIsoString(row.created_at),
        expiresAt: toIsoString(row.expires_at),
        email: normalizedEmail,
        role: user.role as 'customer' | 'provider' | 'operator',
        token: row.token,
        userId: row.user_id,
      };
    }

    // Legacy path: upsert user and create session (no password verification)
    await this.postgresClient.query(
      this.postgresConfig,
      `INSERT INTO users (id, email, role)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET role = EXCLUDED.role`,
      [userId, normalizedEmail, input.role],
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
      [token, normalizedEmail, this.sessionTtlSeconds],
    );

    const row = sessionResult.rows[0];

    if (!row) {
      throw new Error('Failed to create auth session in postgres repository.');
    }

    return {
      createdAt: toIsoString(row.created_at),
      expiresAt: toIsoString(row.expires_at),
      email: normalizedEmail,
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

    return this.postgresClient.withTransaction(async (client) => {
      const userResult = await client.query<{ id: string }>(
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

      const sessionResult = await client.query<SessionRow>(
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
        role: 'customer' as const,
        token: row.token,
        userId: row.user_id,
      };
    });
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

  async requestOtp(phone: string): Promise<RequestOtpResult> {
    const cooldownResult = await this.postgresClient.query<{ id: string }>(
      this.postgresConfig,
      `SELECT id::text FROM otp_codes
       WHERE phone = $1
         AND consumed_at IS NULL
         AND created_at > NOW() - INTERVAL '${OTP_REQUEST_COOLDOWN_SECONDS} seconds'
       LIMIT 1`,
      [phone],
    );

    if (cooldownResult.rows[0]) {
      throw new OtpRequestCooldownError(phone);
    }

    const code = generateOtpCode();
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.postgresClient.query(
      this.postgresConfig,
      `DELETE FROM otp_codes WHERE phone = $1 AND consumed_at IS NULL`,
      [phone],
    );

    await this.postgresClient.query(
      this.postgresConfig,
      `INSERT INTO otp_codes (id, phone, code_hash, expires_at)
       VALUES ($1::uuid, $2, $3, $4)`,
      [randomUUID(), phone, codeHash, expiresAt.toISOString()],
    );

    // ponytail: no SMS/email provider exists in this repo; devCode lets the
    // demo flow be completable end to end. Real delivery is future work.
    return { expiresAt: expiresAt.toISOString(), devCode: code };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthSession> {
    const otpResult = await this.postgresClient.query<{
      id: string;
      code_hash: string;
      expires_at: Date | string;
      attempt_count: number;
    }>(
      this.postgresConfig,
      `SELECT id::text, code_hash, expires_at, attempt_count
       FROM otp_codes
       WHERE phone = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.phone],
    );

    const otpRow = otpResult.rows[0];

    if (!otpRow) {
      throw new InvalidOtpError(input.phone);
    }

    if (new Date(otpRow.expires_at).getTime() <= Date.now()) {
      throw new OtpExpiredError(input.phone);
    }

    if (otpRow.attempt_count >= OTP_MAX_ATTEMPTS) {
      throw new InvalidOtpError(input.phone);
    }

    const isValid = await verifyPassword(input.code, otpRow.code_hash);

    if (!isValid) {
      await this.postgresClient.query(
        this.postgresConfig,
        `UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1::uuid`,
        [otpRow.id],
      );
      throw new InvalidOtpError(input.phone);
    }

    await this.postgresClient.query(
      this.postgresConfig,
      `UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1::uuid`,
      [otpRow.id],
    );

    const userId = randomUUID();
    const token = randomUUID();
    const role: SessionRole = input.role ?? 'customer';

    const userResult = await this.postgresClient.query<{ id: string; role: SessionRole }>(
      this.postgresConfig,
      `INSERT INTO users (id, phone, email, role)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id::text, role`,
      [userId, input.phone, phoneToSyntheticEmail(input.phone), role],
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new Error('Failed to upsert phone-authenticated user in postgres repository.');
    }

    const sessionResult = await this.postgresClient.query<SessionRow>(
      this.postgresConfig,
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1::uuid, $2::uuid, NOW() + make_interval(secs => $3::int))
       RETURNING token::text, user_id::text, created_at, expires_at`,
      [token, user.id, this.sessionTtlSeconds],
    );

    const sessionRow = sessionResult.rows[0];

    if (!sessionRow) {
      throw new Error('Failed to create auth session during OTP verification.');
    }

    return {
      createdAt: toIsoString(sessionRow.created_at),
      expiresAt: toIsoString(sessionRow.expires_at),
      email: phoneToSyntheticEmail(input.phone),
      role: user.role,
      token: sessionRow.token,
      userId: sessionRow.user_id,
    };
  }
}

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_COOLDOWN_SECONDS = 30;

// ponytail: placeholder identity so phone-authenticated users still satisfy
// AuthSession.email (used widely downstream); add real optional-email support
// if a screen needs to distinguish phone- from email-authenticated users.
function phoneToSyntheticEmail(phone: string): string {
  return `${phone.replace(/[^0-9a-zA-Z]/g, '')}@phone.quickwerk.local`;
}

function generateOtpCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, '0');
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const scryptOptions = {
  N: 16_384,
  r: 8,
  p: 1,
} as const;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptHash(password, salt);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = parts[1];
  const storedHash = parts[2];
  const derivedKey = await scryptHash(password, salt);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  // Ensure lengths match before using timingSafeEqual
  if (derivedKey.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedHashBuffer);
}

function isPasswordAuthInput(input: CreateAuthSessionInput): input is PasswordAuthSessionInput {
  return 'password' in input;
}

async function scryptHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, scryptOptions, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}
