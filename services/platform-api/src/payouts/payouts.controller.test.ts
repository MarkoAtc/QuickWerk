import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { correlationIdHeaderName } from '../observability/correlation-id';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

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

describe('PayoutsController', () => {
  it('returns paginated payouts and forwards cursor/limit contract to service', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue({
      token: 'provider-token',
      userId: 'provider-1',
      email: 'provider@quickwerk.local',
      role: 'provider',
      createdAt: '2026-04-01T10:00:00.000Z',
      expiresAt: '2026-04-01T12:00:00.000Z',
    });
    const getMyPayouts = vi.fn().mockResolvedValue({
      payouts: [
        {
          payoutId: 'payout-1',
          providerUserId: 'provider-1',
          bookingId: 'booking-1',
          paymentId: 'payment-1',
          amountCents: 5000,
          currency: 'EUR',
          status: 'pending',
          settlementRef: null,
          createdAt: '2026-04-01T10:00:00.000Z',
          settledAt: null,
        },
      ],
      nextCursor: 'payout-1',
      limit: 1,
    });

    const controller = new PayoutsController(
      { resolveSessionOrNull } as unknown as AuthService,
      { getMyPayouts } as unknown as PayoutsService,
    );

    const response = createResponse();
    const result = await controller.listMyPayouts(
      createRequest({
        method: 'GET',
        path: '/api/v1/providers/me/payouts',
        headers: { authorization: 'Bearer provider-token' },
      }),
      response,
      'Bearer provider-token',
      { cursor: 'cursor-1', limit: '1' },
    );

    expect(result).toMatchObject({
      payouts: [{ payoutId: 'payout-1' }],
      nextCursor: 'payout-1',
      limit: 1,
    });
    expect(getMyPayouts).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'provider-1' }),
      { cursor: 'cursor-1', limit: 1 },
    );
    expect(response.headers[correlationIdHeaderName]).toBeTruthy();
  });

  it('defaults limit to 20 when query limit is omitted', async () => {
    const getMyPayouts = vi.fn().mockResolvedValue({ payouts: [], nextCursor: null, limit: 20 });
    const controller = new PayoutsController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({
          token: 'provider-token',
          userId: 'provider-1',
          email: 'provider@quickwerk.local',
          role: 'provider',
          createdAt: '2026-04-01T10:00:00.000Z',
          expiresAt: '2026-04-01T12:00:00.000Z',
        }),
      } as unknown as AuthService,
      { getMyPayouts } as unknown as PayoutsService,
    );

    await controller.listMyPayouts(
      createRequest({
        method: 'GET',
        path: '/api/v1/providers/me/payouts',
        headers: { authorization: 'Bearer provider-token' },
      }),
      createResponse(),
      'Bearer provider-token',
      {},
    );

    expect(getMyPayouts).toHaveBeenCalledWith(expect.any(Object), { cursor: null, limit: 20 });
  });

  it('caps query limit at 100', async () => {
    const getMyPayouts = vi.fn().mockResolvedValue({ payouts: [], nextCursor: null, limit: 100 });
    const controller = new PayoutsController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({
          token: 'provider-token',
          userId: 'provider-1',
          email: 'provider@quickwerk.local',
          role: 'provider',
          createdAt: '2026-04-01T10:00:00.000Z',
          expiresAt: '2026-04-01T12:00:00.000Z',
        }),
      } as unknown as AuthService,
      { getMyPayouts } as unknown as PayoutsService,
    );

    await controller.listMyPayouts(
      createRequest({
        method: 'GET',
        path: '/api/v1/providers/me/payouts',
        headers: { authorization: 'Bearer provider-token' },
      }),
      createResponse(),
      'Bearer provider-token',
      { limit: '999' },
    );

    expect(getMyPayouts).toHaveBeenCalledWith(expect.any(Object), { cursor: null, limit: 100 });
  });

  it('returns 400 for non-positive or non-integer limit query', async () => {
    const controller = new PayoutsController(
      {
        resolveSessionOrNull: vi.fn().mockResolvedValue({
          token: 'provider-token',
          userId: 'provider-1',
          email: 'provider@quickwerk.local',
          role: 'provider',
          createdAt: '2026-04-01T10:00:00.000Z',
          expiresAt: '2026-04-01T12:00:00.000Z',
        }),
      } as unknown as AuthService,
      { getMyPayouts: vi.fn() } as unknown as PayoutsService,
    );

    await expect(
      controller.listMyPayouts(
        createRequest({
          method: 'GET',
          path: '/api/v1/providers/me/payouts',
          headers: { authorization: 'Bearer provider-token' },
        }),
        createResponse(),
        'Bearer provider-token',
        { limit: '0' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
