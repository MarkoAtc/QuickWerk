import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import { resolvePersistenceMode } from '../persistence/persistence-mode';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSession,
  AuthSessionRepository,
  CreateAuthSessionInput,
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidOtpError,
  OtpExpiredError,
  OtpRequestCooldownError,
  SessionRole,
} from './domain/auth-session.repository';

const publicAuthActions = ['sign-in', 'sign-up', 'password-reset'] as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionStore: AuthSessionRepository,
  ) {}

  /** Null for accounts with no phone on file (e.g. email/password-only), not an error. */
  async getPhoneByUserId(userId: string): Promise<string | null> {
    return this.sessionStore.getPhoneByUserId(userId);
  }

  async getSession(token: string | undefined) {
    const session = await this.sessionStore.resolveSession(token);

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

  async signIn(input: { email?: string; role?: string; password?: string }, context?: { correlationId?: string }) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const role = this.resolveRole(input.role);
    const email = input.email ? this.normalizeEmail(input.email) : 'demo.customer@quickwerk.local';
    const password = input.password;

    const createSessionInput: CreateAuthSessionInput = password
      ? { email, password }
      : {
          email,
          role,
        };

    try {
      const session = await this.sessionStore.createSession(createSessionInput);

      logStructuredBreadcrumb({
        event: 'auth.sign-in.write',
        correlationId,
        status: 'succeeded',
        details: {
          userId: session.userId,
          role,
        },
      });

      return {
        ...(await this.getSession(session.token)),
        token: session.token,
      } as const;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        logStructuredBreadcrumb({
          event: 'auth.sign-in.write',
          correlationId,
          status: 'failed',
          details: { reason: 'invalid-credentials' },
        });
        throw new UnauthorizedException('Invalid email or password.');
      }

      throw error;
    }
  }

  async signUp(
    input: { name?: string; email?: string; password?: string; role?: string },
    context?: { correlationId?: string },
  ) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const name = this.normalizeName(input.name);
    const email = this.normalizeEmail(input.email);
    const password = this.normalizePassword(input.password);
    const role = this.resolveSelfServiceRole(input.role);

    try {
      const session = await this.sessionStore.registerCustomer({
        name,
        email,
        password,
        role,
      });

      logStructuredBreadcrumb({
        event: 'auth.sign-up.write',
        correlationId,
        status: 'succeeded',
        details: {
          userId: session.userId,
          role: session.role,
        },
      });

      return {
        ...(await this.getSession(session.token)),
        token: session.token,
      } as const;
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        logStructuredBreadcrumb({
          event: 'auth.sign-up.write',
          correlationId,
          status: 'failed',
          details: {
            reason: 'duplicate-email',
          },
        });

        throw new ConflictException('An account with this email already exists.');
      }

      throw error;
    }
  }

  async signOut(token: string | undefined, context?: { correlationId?: string }) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const signedOut = await this.sessionStore.deleteSession(token);

    logStructuredBreadcrumb({
      event: 'auth.sign-out.write',
      correlationId,
      status: signedOut ? 'succeeded' : 'failed',
      details: {
        signedOut,
        hadToken: Boolean(token),
      },
    });

    return {
      resource: 'auth-session',
      signedOut,
      sessionState: 'anonymous',
      availableActions: publicAuthActions,
      nextStep: 'sign-in',
    } as const;
  }

  async resolveSessionOrNull(token: string | undefined): Promise<AuthSession | null> {
    return this.sessionStore.resolveSession(token);
  }

  async requestOtp(phoneInput: string | undefined, context?: { correlationId?: string }) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const phone = this.normalizePhone(phoneInput);

    try {
      const result = await this.sessionStore.requestOtp(phone);

      logStructuredBreadcrumb({
        event: 'auth.otp.requested',
        correlationId,
        status: 'succeeded',
      });

      const exposeDevCode = result.devCode && resolvePersistenceMode() === 'in-memory';

      return {
        resource: 'auth-otp',
        phone,
        expiresAt: result.expiresAt,
        ...(exposeDevCode ? { devOtpCode: result.devCode } : {}),
      } as const;
    } catch (error) {
      if (error instanceof OtpRequestCooldownError) {
        logStructuredBreadcrumb({
          event: 'auth.otp.requested',
          correlationId,
          status: 'failed',
          details: { reason: 'cooldown' },
        });
        throw new BadRequestException('A verification code was already sent. Please wait before requesting another.');
      }

      throw error;
    }
  }

  async verifyOtp(input: { phone?: string; code?: string }, context?: { correlationId?: string }) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const phone = this.normalizePhone(input.phone);
    const code = this.normalizeOtpCode(input.code);

    // Role is never accepted from this public, unauthenticated endpoint —
    // repositories default new phone identities to 'customer' and preserve
    // whatever role an existing user already has on repeat verification.
    try {
      const session = await this.sessionStore.verifyOtp({ phone, code });

      logStructuredBreadcrumb({
        event: 'auth.otp.verified',
        correlationId,
        status: 'succeeded',
        details: { userId: session.userId, role: session.role },
      });

      return {
        ...(await this.getSession(session.token)),
        token: session.token,
      } as const;
    } catch (error) {
      if (error instanceof InvalidOtpError || error instanceof OtpExpiredError) {
        logStructuredBreadcrumb({
          event: 'auth.otp.verified',
          correlationId,
          status: 'failed',
          details: { reason: error.name },
        });
        throw new BadRequestException('Invalid or expired verification code.');
      }

      throw error;
    }
  }

  /**
   * Local browser-QA fixture. This is deliberately not an OTP shortcut for
   * normal clients: it is available only when an operator explicitly enables
   * it and the API is using disposable in-memory persistence.
   */
  async createLocalBrowserTestSession() {
    if (process.env.QUICKWERK_LOCAL_E2E_AUTH !== 'true' || resolvePersistenceMode() !== 'in-memory') {
      throw new UnauthorizedException('Local browser auth fixture is disabled.');
    }

    return this.signIn({ email: 'browser.qa.customer@quickwerk.local', role: 'customer' });
  }

  private normalizePhone(phone: string | undefined): string {
    const digitsAndPlus = phone?.trim().replace(/[^\d+]/g, '') ?? '';

    if (!/^\+\d{8,15}$/.test(digitsAndPlus)) {
      throw new BadRequestException('Phone must be a valid number in international format, e.g. +15550001234.');
    }

    return digitsAndPlus;
  }

  private normalizeOtpCode(code: string | undefined): string {
    const normalized = code?.trim() ?? '';

    if (!/^\d{6}$/.test(normalized)) {
      throw new BadRequestException('Verification code must be 6 digits.');
    }

    return normalized;
  }

  private resolveRole(role: string | undefined): SessionRole {
    const normalizedRole = role?.trim().toLowerCase();

    if (normalizedRole === 'provider') {
      return 'provider';
    }

    if (normalizedRole === 'operator') {
      return 'operator';
    }

    return 'customer';
  }

  // Public self-service sign-up: 'operator' is never self-service-creatable
  // (would be a privilege-escalation path via a public, unauthenticated
  // endpoint). signIn still allows resolving an existing operator's role via
  // resolveRole above — this guard is sign-up-only.
  private resolveSelfServiceRole(role: string | undefined): SessionRole {
    const resolved = this.resolveRole(role);

    if (resolved === 'operator') {
      throw new BadRequestException('Operator accounts cannot self-register.');
    }

    return resolved;
  }

  private normalizeName(name: string | undefined): string {
    const normalized = name?.trim() ?? '';

    if (normalized.length < 2) {
      throw new BadRequestException('Name must include at least 2 characters.');
    }

    return normalized;
  }

  private normalizeEmail(email: string | undefined): string {
    const normalized = email?.trim().toLowerCase() ?? '';

    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Email must be a valid address.');
    }

    return normalized;
  }

  private normalizePassword(password: string | undefined): string {
    const normalized = password ?? '';

    if (normalized.length < 8) {
      throw new BadRequestException('Password must include at least 8 characters.');
    }

    return normalized;
  }
}
