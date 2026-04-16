/**
 * Integration tests for GET /api/v1/providers/:providerUserId (Slice 4).
 *
 * Uses the full NestJS AppModule with in-memory repositories.
 * Covers: found, not-found, private-profile (404).
 */
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { correlationIdHeaderName } from '../observability/correlation-id';
import { ProvidersController } from './providers.controller';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
};

function createRequest(input: {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
}): RequestLike {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    method: input.method,
    path: input.path,
    header(name: string) {
      return normalizedHeaders[name.toLowerCase()];
    },
  };
}

function createResponse(): ResponseLike {
  return {
    headers: {},
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

function extractProviderCredentials(signInResult: unknown): { token: string; userId: string } {
  const result = signInResult as { token?: string; session?: { userId?: string } };
  const token = result.token;
  const userId = result.session?.userId;

  if (!token || !userId) {
    throw new Error('sign-in did not return expected fields');
  }

  return { token, userId };
}

describe('ProvidersController GET /:providerUserId', () => {
  it('returns 200 with the provider profile for a known public provider', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const controller = moduleRef.get(ProvidersController);
    const authService = moduleRef.get(AuthService);

    // Sign in as provider — signIn always succeeds for valid inputs
    const signInResult = await authService.signIn({
      email: 'detail-test-provider@quickwerk.local',
      role: 'provider',
    });
    // signIn returns { ..., token, session: { userId, email, role } }
    const { token: providerToken, userId: providerUserId } = extractProviderCredentials(signInResult);

    // Upsert public profile via controller
    await controller.upsertProfile(
      createRequest({ method: 'PUT', path: '/api/v1/providers/me/profile' }),
      createResponse(),
      `Bearer ${providerToken}`,
      {
        displayName: 'Detail Test Provider',
        tradeCategories: ['plumbing'],
        serviceArea: 'Vienna',
        isPublic: true,
      },
    );

    const operatorSignInResult = await authService.signIn({
      email: 'detail-test-operator@quickwerk.local',
      role: 'operator',
    });
    const { token: operatorToken } = extractProviderCredentials(operatorSignInResult);

    const submittedVerification = await controller.submitVerification(
      createRequest({ method: 'POST', path: '/api/v1/providers/me/verification' }),
      createResponse(),
      `Bearer ${providerToken}`,
      {
        tradeCategories: ['plumbing'],
        documents: [{ filename: 'license.pdf', mimeType: 'application/pdf' }],
      },
    );

    await controller.reviewVerification(
      createRequest({
        method: 'POST',
        path: `/api/v1/providers/verifications/${submittedVerification.verificationId}/review`,
      }),
      createResponse(),
      `Bearer ${operatorToken}`,
      submittedVerification.verificationId,
      { decision: 'approved' },
    );

    // Fetch single provider — public, no auth required
    const response = createResponse();
    const result = await controller.getPublicProvider(
      createRequest({ method: 'GET', path: `/api/v1/providers/${providerUserId}` }),
      response,
      providerUserId,
    );

    expect(result).toMatchObject({
      providerUserId,
      displayName: 'Detail Test Provider',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
      isPublic: true,
    });
    expect(response.headers[correlationIdHeaderName]).toBeTruthy();

    await moduleRef.close();
  });

  it('throws 404 for a provider that does not exist', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const controller = moduleRef.get(ProvidersController);

    await expect(
      controller.getPublicProvider(
        createRequest({ method: 'GET', path: '/api/v1/providers/nonexistent-id' }),
        createResponse(),
        'nonexistent-id',
      ),
    ).rejects.toMatchObject({ status: 404 });

    await moduleRef.close();
  });

  it('throws 404 for a provider whose profile is not public', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const controller = moduleRef.get(ProvidersController);
    const authService = moduleRef.get(AuthService);

    const signInResult = await authService.signIn({
      email: 'private-provider-detail@quickwerk.local',
      role: 'provider',
    });
    const { token: providerToken, userId: providerUserId } = extractProviderCredentials(signInResult);

    await controller.upsertProfile(
      createRequest({ method: 'PUT', path: '/api/v1/providers/me/profile' }),
      createResponse(),
      `Bearer ${providerToken}`,
      {
        displayName: 'Private Provider',
        tradeCategories: ['electrical'],
        isPublic: false,
      },
    );

    await expect(
      controller.getPublicProvider(
        createRequest({ method: 'GET', path: `/api/v1/providers/${providerUserId}` }),
        createResponse(),
        providerUserId,
      ),
    ).rejects.toMatchObject({ status: 404 });

    await moduleRef.close();
  });
});
