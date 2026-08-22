import { Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import {
  PAYMENT_METHOD_REPOSITORY,
  PaymentMethodRecord,
  PaymentMethodRepository,
} from './domain/payment-method.repository';

// Whitelist, not a blocklist of card-shaped key names -- a blocklist is guessable-around
// (card_number, cardNo, securityCode, ...); rejecting anything outside this exact pair
// cannot be bypassed by a naming variant, and it makes the "no real card data ever
// touches the server" guarantee structural rather than a maintained list.
export const ALLOWED_PAYMENT_METHOD_KEYS = ['label', 'brand'] as const;

const DEFAULT_LABEL = 'Payment method';
const DEFAULT_BRAND = 'card';

export type AddPaymentMethodResult =
  | { ok: true; statusCode: 201; paymentMethod: PaymentMethodRecord }
  | { ok: false; statusCode: 400; error: string };

@Injectable()
export class PaymentMethodsService {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethods: PaymentMethodRepository,
  ) {}

  async addPaymentMethod(
    session: AuthSession,
    rawBody: unknown,
    context?: { correlationId?: string },
  ): Promise<AddPaymentMethodResult> {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return { ok: false, statusCode: 400, error: 'Request body must be an object.' };
    }

    const unexpectedKey = Object.keys(rawBody as Record<string, unknown>).find(
      (key) => !(ALLOWED_PAYMENT_METHOD_KEYS as readonly string[]).includes(key),
    );

    if (unexpectedKey) {
      logStructuredBreadcrumb({
        event: 'payment-method.create.write',
        correlationId,
        status: 'failed',
        details: {
          reason: 'unexpected-field-rejected',
          actorUserId: session.userId,
          unexpectedKey,
        },
      });

      return { ok: false, statusCode: 400, error: `Unexpected field "${unexpectedKey}" is not accepted.` };
    }

    const body = rawBody as { label?: unknown; brand?: unknown };
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : DEFAULT_LABEL;
    const brand = typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim() : DEFAULT_BRAND;
    const last4 = String(randomInt(1000, 10000));

    const paymentMethod = await this.paymentMethods.createPaymentMethod({
      customerUserId: session.userId,
      label,
      brand,
      last4,
      createdAt: new Date().toISOString(),
    });

    logStructuredBreadcrumb({
      event: 'payment-method.create.write',
      correlationId,
      status: 'succeeded',
      details: {
        paymentMethodId: paymentMethod.paymentMethodId,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
      },
    });

    return { ok: true, statusCode: 201, paymentMethod };
  }

  async listMyPaymentMethods(session: AuthSession): Promise<PaymentMethodRecord[]> {
    return this.paymentMethods.listPaymentMethodsForCustomer(session.userId);
  }

  /**
   * Ownership-checked lookup for the checkout flow -- returns null (not the record)
   * when the payment method exists but belongs to a different customer, so callers
   * can't distinguish "not found" from "not yours" and leak existence of another
   * customer's payment method.
   */
  async getPaymentMethodOwnedByCustomer(
    customerUserId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethodRecord | null> {
    const paymentMethod = await this.paymentMethods.getPaymentMethodById(paymentMethodId);

    if (!paymentMethod || paymentMethod.customerUserId !== customerUserId) {
      return null;
    }

    return paymentMethod;
  }
}
