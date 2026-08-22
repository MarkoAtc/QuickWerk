export type PaymentMethodRecord = {
  paymentMethodId: string;
  customerUserId: string;
  label: string;
  last4: string;
  brand: string;
  source: 'simulated';
  createdAt: string;
};

export type CreatePaymentMethodInput = {
  customerUserId: string;
  label: string;
  brand: string;
  last4: string;
  createdAt: string;
};

export interface PaymentMethodRepository {
  createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethodRecord>;
  listPaymentMethodsForCustomer(customerUserId: string): Promise<PaymentMethodRecord[]>;
}

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');
