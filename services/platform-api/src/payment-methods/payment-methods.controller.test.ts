import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
};

function createRequest(input: { method: string; path: string }): RequestLike {
  return {
    method: input.method,
    path: input.path,
    header() {
      return undefined;
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

const customerSession = {
  token: 'customer-token',
  userId: 'customer-1',
  email: 'customer@quickwerk.local',
  role: 'customer' as const,
  createdAt: '2026-08-22T10:00:00.000Z',
  expiresAt: '2026-08-22T12:00:00.000Z',
};

describe('PaymentMethodsController.addPaymentMethod', () => {
  it('returns 401 when no session is resolved', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue(null);
    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      {} as unknown as PaymentMethodsService,
    );

    await expect(
      controller.addPaymentMethod(
        createRequest({ method: 'POST', path: '/api/v1/customers/me/payment-methods' }),
        createResponse(),
        undefined,
        { label: 'Card' },
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('returns 403 for a non-customer role', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue({ ...customerSession, role: 'provider' });
    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      {} as unknown as PaymentMethodsService,
    );

    await expect(
      controller.addPaymentMethod(
        createRequest({ method: 'POST', path: '/api/v1/customers/me/payment-methods' }),
        createResponse(),
        'Bearer provider-token',
        { label: 'Card' },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('delegates to the service and returns the created payment method', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue(customerSession);
    const paymentMethod = {
      paymentMethodId: 'pm-1',
      customerUserId: 'customer-1',
      label: 'My Visa',
      brand: 'visa',
      last4: '4242',
      source: 'simulated' as const,
      createdAt: '2026-08-22T10:00:00.000Z',
    };
    const addPaymentMethod = vi.fn().mockResolvedValue({ ok: true, statusCode: 201, paymentMethod });

    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      { addPaymentMethod } as unknown as PaymentMethodsService,
    );

    const result = await controller.addPaymentMethod(
      createRequest({ method: 'POST', path: '/api/v1/customers/me/payment-methods' }),
      createResponse(),
      'Bearer customer-token',
      { label: 'My Visa', brand: 'visa' },
    );

    expect(addPaymentMethod).toHaveBeenCalledWith(customerSession, { label: 'My Visa', brand: 'visa' }, expect.any(Object));
    expect(result).toEqual(paymentMethod);
  });

  it('propagates a 400 rejection from the service as an HttpException', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue(customerSession);
    const addPaymentMethod = vi.fn().mockResolvedValue({
      ok: false,
      statusCode: 400,
      error: 'Unexpected field "cardNumber" is not accepted.',
    });

    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      { addPaymentMethod } as unknown as PaymentMethodsService,
    );

    await expect(
      controller.addPaymentMethod(
        createRequest({ method: 'POST', path: '/api/v1/customers/me/payment-methods' }),
        createResponse(),
        'Bearer customer-token',
        { cardNumber: '4242424242424242' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('PaymentMethodsController.listMyPaymentMethods', () => {
  it('returns 403 for a non-customer role', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue({ ...customerSession, role: 'operator' });
    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      {} as unknown as PaymentMethodsService,
    );

    await expect(
      controller.listMyPaymentMethods(
        createRequest({ method: 'GET', path: '/api/v1/customers/me/payment-methods' }),
        createResponse(),
        'Bearer operator-token',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('delegates to the service for the authenticated customer', async () => {
    const resolveSessionOrNull = vi.fn().mockResolvedValue(customerSession);
    const listMyPaymentMethods = vi.fn().mockResolvedValue([]);
    const controller = new PaymentMethodsController(
      { resolveSessionOrNull } as unknown as AuthService,
      { listMyPaymentMethods } as unknown as PaymentMethodsService,
    );

    const result = await controller.listMyPaymentMethods(
      createRequest({ method: 'GET', path: '/api/v1/customers/me/payment-methods' }),
      createResponse(),
      'Bearer customer-token',
    );

    expect(listMyPaymentMethods).toHaveBeenCalledWith(customerSession);
    expect(result).toEqual([]);
  });
});
