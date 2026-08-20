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

const phoneByUserId: Record<string, string> = {
  'customer-1': '+15550001111',
  'provider-1': '+15550002222',
};

const createProvidersServiceStub = (): ProvidersService =>
  ({
    getProviderApprovalStatus: async () => 'approved',
  }) as unknown as ProvidersService;

const createAuthServiceStub = (): AuthService =>
  ({
    getPhoneByUserId: async (userId: string) => phoneByUserId[userId] ?? null,
  }) as unknown as AuthService;

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

  return new BookingsService(
    new InMemoryBookingRepository(),
    eventPublisher,
    paymentsService,
    createProvidersServiceStub(),
    createAuthServiceStub(),
  );
};

describe('BookingsService.getBookingContact — denial paths', () => {
  it('denies a customer who is not a party to the booking', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const otherCustomer = createSession('customer', 'customer-2');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingContact(otherCustomer, created.booking.bookingId);

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

    const result = await service.getBookingContact(otherProvider, created.booking.bookingId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(403);
  });

  it('returns 404 for an unknown booking', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const result = await service.getBookingContact(customer, 'does-not-exist');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns no phone before the booking is accepted, even for the owning customer', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');

    const result = await service.getBookingContact(customer, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phone).toBeNull();
  });
});

describe('BookingsService.getBookingContact — happy paths', () => {
  it('returns the provider phone to the customer once accepted', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingContact(customer, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phone).toBe('+15550002222');
  });

  it('returns the customer phone to the assigned provider (symmetric authorization)', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingContact(provider, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phone).toBe('+15550001111');
  });

  it('returns null when the counterpart has no phone on file', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-with-no-phone');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Fix sink' });
    if (!created.ok) throw new Error('create failed');
    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingContact(provider, created.booking.bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.phone).toBeNull();
  });
});
