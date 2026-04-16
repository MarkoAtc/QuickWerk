import { describe, expect, it, vi } from 'vitest';

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

const createRequest = (method: string, path: string): RequestLike => ({
  method,
  path,
  header() {
    return undefined;
  },
});

const createResponse = (): ResponseLike => ({
  headers: {},
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  },
});

describe('ProvidersController review verification decision validation', () => {
  it('accepts request-more-info decision', async () => {
    const authService = {
      resolveSessionOrNull: vi.fn().mockResolvedValue({
        userId: 'operator-1',
        email: 'operator@example.com',
        role: 'operator',
      }),
    };
    const providersService = {
      reviewVerification: vi.fn().mockResolvedValue({
        ok: true,
        statusCode: 200,
        verification: {
          verificationId: 'ver-1',
          providerUserId: 'provider-1',
          providerEmail: 'provider@example.com',
          tradeCategories: ['plumbing'],
          documents: [],
          status: 'request-more-info',
          submittedAt: '2026-01-01T10:00:00.000Z',
          reviewedAt: '2026-01-01T11:00:00.000Z',
          reviewedByUserId: 'operator-1',
          reviewNote: 'Need clearer license image.',
          statusHistory: [],
        },
      }),
    };

    const controller = new ProvidersController(authService as never, providersService as never);

    const result = await controller.reviewVerification(
      createRequest('POST', '/api/v1/providers/verifications/ver-1/review'),
      createResponse(),
      'Bearer token',
      'ver-1',
      { decision: 'request-more-info', reviewNote: 'Need clearer license image.' },
    );

    expect(result).toMatchObject({ status: 'request-more-info' });
    expect(providersService.reviewVerification).toHaveBeenCalledWith(
      expect.anything(),
      'ver-1',
      { decision: 'request-more-info', reviewNote: 'Need clearer license image.' },
      expect.anything(),
    );
  });

  it('returns 400 for unknown decision', async () => {
    const authService = {
      resolveSessionOrNull: vi.fn().mockResolvedValue({
        userId: 'operator-1',
        email: 'operator@example.com',
        role: 'operator',
      }),
    };
    const providersService = {
      reviewVerification: vi.fn(),
    };

    const controller = new ProvidersController(authService as never, providersService as never);

    await expect(
      controller.reviewVerification(
        createRequest('POST', '/api/v1/providers/verifications/ver-1/review'),
        createResponse(),
        'Bearer token',
        'ver-1',
        { decision: 'maybe' },
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(providersService.reviewVerification).not.toHaveBeenCalled();
  });
});
