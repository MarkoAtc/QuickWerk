import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';

import { logStructuredBreadcrumb } from '../observability/structured-log';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSession,
  AuthSessionRepository,
  DuplicateEmailError,
  SessionRole,
} from './domain/auth-session.repository';

const publicAuthActions = ['sign-in', 'sign-up', 'password-reset'] as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionStore: AuthSessionRepository,
  ) {}

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

  async signIn(input: { email?: string; role?: string }, context?: { correlationId?: string }) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const role = this.resolveRole(input.role);

    const session = await this.sessionStore.createSession({
      email: input.email?.trim() || 'demo.customer@quickwerk.local',
      role,
    });

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
  }

  async signUp(
    input: { name?: string; email?: string; password?: string },
    context?: { correlationId?: string },
  ) {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const name = this.normalizeName(input.name);
    const email = this.normalizeEmail(input.email);
    const password = this.normalizePassword(input.password);

    try {
      const session = await this.sessionStore.registerCustomer({
        name,
        email,
        password,
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
