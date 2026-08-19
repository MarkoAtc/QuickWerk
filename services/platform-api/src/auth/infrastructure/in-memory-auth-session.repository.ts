import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { computeSessionExpiryIso, isSessionExpired, resolveAuthSessionTtlSeconds } from '../domain/auth-session-expiry';
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

type RegisteredCustomer = {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
};

type OtpRecord = {
  codeHash: string;
  expiresAt: number;
  attemptCount: number;
  requestedAt: number;
};

type PhoneUser = {
  userId: string;
  role: SessionRole;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_COOLDOWN_MS = 30 * 1000;

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();
  private readonly customersByEmail = new Map<string, RegisteredCustomer>();
  private readonly otpByPhone = new Map<string, OtpRecord>();
  private readonly usersByPhone = new Map<string, PhoneUser>();
  private readonly sessionTtlSeconds = resolveAuthSessionTtlSeconds();

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const token = randomUUID();
    const now = new Date().toISOString();
    const registeredCustomer = this.customersByEmail.get(input.email);
    const role = isPasswordAuthInput(input) ? 'customer' : input.role;
    const session: AuthSession = {
      createdAt: now,
      expiresAt: computeSessionExpiryIso(now, this.sessionTtlSeconds),
      email: input.email,
      role,
      token,
      userId: registeredCustomer?.userId ?? `${role}-${token.slice(0, 8)}`,
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

  async requestOtp(phone: string): Promise<RequestOtpResult> {
    const now = Date.now();
    const existing = this.otpByPhone.get(phone);

    if (existing && now - existing.requestedAt < OTP_REQUEST_COOLDOWN_MS) {
      throw new OtpRequestCooldownError(phone);
    }

    const code = generateOtpCode();
    const expiresAt = now + OTP_TTL_MS;

    this.otpByPhone.set(phone, {
      codeHash: await hashPassword(code),
      expiresAt,
      attemptCount: 0,
      requestedAt: now,
    });

    // ponytail: no SMS/email provider exists in this repo; devCode lets the
    // in-memory (demo) flow be completable end to end. Real delivery is future work.
    return { expiresAt: new Date(expiresAt).toISOString(), devCode: code };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthSession> {
    const record = this.otpByPhone.get(input.phone);

    if (!record) {
      throw new InvalidOtpError(input.phone);
    }

    if (Date.now() > record.expiresAt) {
      this.otpByPhone.delete(input.phone);
      throw new OtpExpiredError(input.phone);
    }

    if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
      this.otpByPhone.delete(input.phone);
      throw new InvalidOtpError(input.phone);
    }

    const isValid = await verifyHashedCode(input.code, record.codeHash);

    if (!isValid) {
      record.attemptCount += 1;
      throw new InvalidOtpError(input.phone);
    }

    // Re-check identity (no await between here and delete, so this is
    // effectively atomic in single-threaded Node): if a concurrent verify
    // already consumed/replaced this record while we awaited the hash
    // check above, this call loses the race instead of also succeeding.
    if (this.otpByPhone.get(input.phone) !== record) {
      throw new InvalidOtpError(input.phone);
    }
    this.otpByPhone.delete(input.phone);

    const existingUser = this.usersByPhone.get(input.phone);
    const role = existingUser?.role ?? 'customer';
    const userId = existingUser?.userId ?? `${role}-${randomUUID().slice(0, 8)}`;
    this.usersByPhone.set(input.phone, { userId, role });

    const token = randomUUID();
    const now = new Date().toISOString();
    const session: AuthSession = {
      createdAt: now,
      expiresAt: computeSessionExpiryIso(now, this.sessionTtlSeconds),
      email: phoneToSyntheticEmail(input.phone),
      role,
      token,
      userId,
    };

    this.sessions.set(token, session);

    return session;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyHashedCode(code: string, hash: string): Promise<boolean> {
  const parts = hash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, storedHash] = parts;
  const derivedKey = (await scryptAsync(code, salt, 64)) as Buffer;
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (derivedKey.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedHashBuffer);
}

function generateOtpCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, '0');
}

// ponytail: placeholder identity so phone-authenticated users still satisfy
// AuthSession.email (used widely downstream); add real optional-email support
// if a screen needs to distinguish phone- from email-authenticated users.
function phoneToSyntheticEmail(phone: string): string {
  return `${phone.replace(/[^0-9a-zA-Z]/g, '')}@phone.quickwerk.local`;
}

function isPasswordAuthInput(input: CreateAuthSessionInput): input is PasswordAuthSessionInput {
  return 'password' in input;
}
