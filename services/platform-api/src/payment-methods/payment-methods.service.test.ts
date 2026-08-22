import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryPaymentMethodRepository } from './infrastructure/in-memory-payment-method.repository';
import { PaymentMethodsService } from './payment-methods.service';

const createSession = (userId: string): AuthSession => ({
  createdAt: '2026-08-22T10:00:00.000Z',
  expiresAt: '2026-08-22T12:00:00.000Z',
  email: `${userId}@quickwerk.local`,
  role: 'customer',
  token: `${userId}-token`,
  userId,
});

const createService = () => {
  const repository = new InMemoryPaymentMethodRepository();
  return { service: new PaymentMethodsService(repository), repository };
};

describe('PaymentMethodsService.addPaymentMethod', () => {
  it('rejects a body containing any key other than label/brand, without touching the repository', async () => {
    const { service, repository } = createService();
    const session = createSession('customer-1');

    const result = await service.addPaymentMethod(session, { label: 'My card', cardNumber: '4242424242424242' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(400);

    const stored = await repository.listPaymentMethodsForCustomer('customer-1');
    expect(stored).toHaveLength(0);
  });

  it('rejects PAN/CVV/expiry-shaped keys under any naming variant, not just the exact examples', async () => {
    const { service, repository } = createService();
    const session = createSession('customer-1');

    for (const badKey of ['pan', 'card_number', 'cardNo', 'cvv', 'securityCode', 'expMonth']) {
      const result = await service.addPaymentMethod(session, { label: 'Card', [badKey]: 'x' });
      expect(result.ok).toBe(false);
    }

    expect(await repository.listPaymentMethodsForCustomer('customer-1')).toHaveLength(0);
  });

  it('adds a payment method with only label/brand, generating a simulated last4 server-side', async () => {
    const { service } = createService();
    const session = createSession('customer-1');

    const result = await service.addPaymentMethod(session, { label: 'My Visa', brand: 'visa' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paymentMethod.customerUserId).toBe('customer-1');
    expect(result.paymentMethod.label).toBe('My Visa');
    expect(result.paymentMethod.brand).toBe('visa');
    expect(result.paymentMethod.source).toBe('simulated');
    expect(result.paymentMethod.last4).toMatch(/^\d{4}$/);
  });

  it('defaults label/brand to generic values when omitted', async () => {
    const { service } = createService();
    const session = createSession('customer-1');

    const result = await service.addPaymentMethod(session, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paymentMethod.label).toBeTruthy();
    expect(result.paymentMethod.brand).toBeTruthy();
  });
});

describe('PaymentMethodsService.listMyPaymentMethods', () => {
  it('returns only the calling customer\'s own payment methods, newest first', async () => {
    const { service } = createService();
    const customerA = createSession('customer-a');
    const customerB = createSession('customer-b');

    await service.addPaymentMethod(customerA, { label: 'A - first' });
    await service.addPaymentMethod(customerA, { label: 'A - second' });
    await service.addPaymentMethod(customerB, { label: 'B - only' });

    const listA = await service.listMyPaymentMethods(customerA);
    const listB = await service.listMyPaymentMethods(customerB);

    expect(listA.map((m) => m.label)).toEqual(['A - second', 'A - first']);
    expect(listB.map((m) => m.label)).toEqual(['B - only']);
  });
});

describe('PaymentMethodsService.getPaymentMethodOwnedByCustomer', () => {
  it('returns the payment method when it belongs to the calling customer', async () => {
    const { service } = createService();
    const session = createSession('customer-1');

    const added = await service.addPaymentMethod(session, { label: 'My Visa' });
    if (!added.ok) throw new Error('setup failed');

    const found = await service.getPaymentMethodOwnedByCustomer('customer-1', added.paymentMethod.paymentMethodId);
    expect(found?.paymentMethodId).toBe(added.paymentMethod.paymentMethodId);
  });

  it('returns null for a payment method owned by a different customer', async () => {
    const { service } = createService();
    const owner = createSession('customer-1');

    const added = await service.addPaymentMethod(owner, { label: 'My Visa' });
    if (!added.ok) throw new Error('setup failed');

    const found = await service.getPaymentMethodOwnedByCustomer('customer-2', added.paymentMethod.paymentMethodId);
    expect(found).toBeNull();
  });

  it('returns null for a nonexistent payment method id', async () => {
    const { service } = createService();
    const found = await service.getPaymentMethodOwnedByCustomer('customer-1', 'does-not-exist');
    expect(found).toBeNull();
  });
});
