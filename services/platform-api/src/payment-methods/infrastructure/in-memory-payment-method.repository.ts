import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  CreatePaymentMethodInput,
  PaymentMethodRecord,
  PaymentMethodRepository,
} from '../domain/payment-method.repository';

@Injectable()
export class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private readonly paymentMethods = new Map<string, PaymentMethodRecord>();

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethodRecord> {
    const paymentMethodId = randomUUID();
    const record: PaymentMethodRecord = {
      paymentMethodId,
      customerUserId: input.customerUserId,
      label: input.label,
      brand: input.brand,
      last4: input.last4,
      source: 'simulated',
      createdAt: input.createdAt,
    };

    this.paymentMethods.set(paymentMethodId, record);
    return record;
  }

  async listPaymentMethodsForCustomer(customerUserId: string): Promise<PaymentMethodRecord[]> {
    // Reverse before the stable sort so same-millisecond ties (creation resolution is
    // coarser than test/real-world call spacing) still order most-recently-inserted first,
    // matching Map insertion order rather than an arbitrary tie order.
    return Array.from(this.paymentMethods.values())
      .reverse()
      .filter((method) => method.customerUserId === customerUserId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async getPaymentMethodById(paymentMethodId: string): Promise<PaymentMethodRecord | null> {
    return this.paymentMethods.get(paymentMethodId) ?? null;
  }
}
