import { describe, expect, it } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryInvoiceRepository } from '../invoices/infrastructure/in-memory-invoice.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { InMemoryPaymentRepository } from '../payments/infrastructure/in-memory-payment.repository';
import { PaymentsService } from '../payments/payments.service';
import { InMemoryPayoutRepository } from '../payouts/infrastructure/in-memory-payout.repository';
import { PayoutsService } from '../payouts/payouts.service';
import { ProvidersService } from '../providers/providers.service';
import { BookingsService } from './bookings.service';
import { InMemoryBookingRepository } from './infrastructure/in-memory-booking.repository';
import { InMemoryQuoteRepository } from './infrastructure/in-memory-quote.repository';
import { InMemoryPaymentMethodRepository } from '../payment-methods/infrastructure/in-memory-payment-method.repository';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';

const createSession = (role: AuthSession['role'], userId: string): AuthSession => {
  const createdAt = new Date();
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 1000 * 60 * 60).toISOString(),
    email: `${role}@quickwerk.local`,
    role,
    token: `${role}-token`,
    userId,
  };
};

const providerIdentity = {
  displayName: 'Marcus Hoffman',
  photoUrl: 'https://storage.stub/photo.jpg',
  vehicleDescription: 'White VW Transporter',
  licensePlate: 'B-HW-2024',
};

const createProvidersServiceStub = (): ProvidersService =>
  ({
    getProviderApprovalStatus: async () => 'approved',
    getProviderIdentitySummary: async () => providerIdentity,
  }) as unknown as ProvidersService;

const createService = () => {
  const paymentsService = new PaymentsService(
    new InMemoryPaymentRepository(),
    new PayoutsService(new InMemoryPayoutRepository()),
    new InvoicesService(new InMemoryInvoiceRepository()),
  );
  const eventPublisher = {
    async publishBookingCreated() {},
    async publishBookingAccepted() {},
    async publishBookingDeclined() {},
    async publishBookingCompleted() {},
    async publishPaymentCaptured() {},
  };

  const authService = { getPhoneByUserId: async () => null } as unknown as AuthService;

  return new BookingsService(
    new InMemoryBookingRepository(),
    eventPublisher,
    paymentsService,
    createProvidersServiceStub(),
    authService,
    new PaymentMethodsService(new InMemoryPaymentMethodRepository()),
    new InMemoryQuoteRepository(),
  );
};

describe('BookingsService.getBookingProviderIdentity', () => {
  it('returns null before a provider is assigned', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');

    const result = await service.getBookingProviderIdentity(customer, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.providerIdentity).toBeNull();
  });

  it('returns the provider identity to the customer once accepted', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingProviderIdentity(customer, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.providerIdentity).toEqual(providerIdentity);
  });

  it('returns the provider identity to the assigned provider too', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingProviderIdentity(provider, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.providerIdentity).toEqual(providerIdentity);
  });

  it('denies a customer who is not a party to the booking', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const otherCustomer = createSession('customer', 'customer-2');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingProviderIdentity(otherCustomer, created.booking.bookingId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('denies a provider who is not the assigned provider', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');
    const otherProvider = createSession('provider', 'provider-2');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingProviderIdentity(otherProvider, created.booking.bookingId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('returns 404 for an unknown booking', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const result = await service.getBookingProviderIdentity(customer, 'does-not-exist');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('denies an operator who is not a party to the booking (regression: role-branching let non-customer/provider roles fall through)', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');
    const operator = createSession('operator', 'operator-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingProviderIdentity(operator, created.booking.bookingId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });
});
