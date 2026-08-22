import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';
import { describe, expect, it } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { AuthSession } from '../auth/domain/auth-session.repository';
import { BookingDomainEventPublisher } from '../orchestration/domain-event.publisher';
import { InMemoryInvoiceRepository } from '../invoices/infrastructure/in-memory-invoice.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { InMemoryPaymentRepository } from '../payments/infrastructure/in-memory-payment.repository';
import { PaymentsService } from '../payments/payments.service';
import { InMemoryPaymentMethodRepository } from '../payment-methods/infrastructure/in-memory-payment-method.repository';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { InMemoryPayoutRepository } from '../payouts/infrastructure/in-memory-payout.repository';
import { PayoutsService } from '../payouts/payouts.service';
import { ProvidersService } from '../providers/providers.service';
import { BookingsService } from './bookings.service';
import { InMemoryBookingRepository } from './infrastructure/in-memory-booking.repository';
import { InMemoryQuoteRepository } from './infrastructure/in-memory-quote.repository';

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

const createService = () => {
  const eventPublisher: BookingDomainEventPublisher = {
    async publishBookingCreated(_event: BookingCreatedDomainEvent) {},
    async publishBookingAccepted(_event: BookingAcceptedDomainEvent) {},
    async publishBookingDeclined(_event: BookingDeclinedDomainEvent) {},
    async publishBookingCompleted(_event: BookingCompletedDomainEvent) {},
    async publishPaymentCaptured(_event: PaymentCapturedDomainEvent) {},
  };
  const payoutRepository = new InMemoryPayoutRepository();
  const invoiceRepository = new InMemoryInvoiceRepository();
  const paymentsService = new PaymentsService(
    new InMemoryPaymentRepository(),
    new PayoutsService(payoutRepository),
    new InvoicesService(invoiceRepository),
  );
  const providersService = ({
    getProviderApprovalStatus: async () => 'approved',
  }) as unknown as ProvidersService;
  const authService = { getPhoneByUserId: async () => null } as unknown as AuthService;
  const paymentMethodsService = new PaymentMethodsService(new InMemoryPaymentMethodRepository());
  const quoteRepository = new InMemoryQuoteRepository();

  return {
    service: new BookingsService(
      new InMemoryBookingRepository(),
      eventPublisher,
      paymentsService,
      providersService,
      authService,
      paymentMethodsService,
      quoteRepository,
    ),
    paymentsService,
    paymentMethodsService,
    quoteRepository,
    payoutRepository,
    invoiceRepository,
  };
};

async function setUpAcceptedBooking(
  service: BookingsService,
  paymentMethodsService: PaymentMethodsService,
) {
  const customer = createSession('customer', 'customer-1');
  const provider = createSession('provider', 'provider-1');

  const created = await service.createBooking(customer, {
    requestedService: 'Plumbing / Leaky faucet / scheduled',
    serviceCategory: 'plumbing',
    urgency: 'scheduled',
  });
  if (!created.ok) throw new Error('setup failed: createBooking');

  await service.acceptBooking(provider, created.booking.bookingId);

  const addedMethod = await paymentMethodsService.addPaymentMethod(customer, { label: 'My Visa' });
  if (!addedMethod.ok) throw new Error('setup failed: addPaymentMethod');

  return { customer, provider, bookingId: created.booking.bookingId, paymentMethodId: addedMethod.paymentMethod.paymentMethodId };
}

describe('BookingsService.requestBookingQuote', () => {
  it('returns a quote with the exact known plumbing/scheduled total', async () => {
    const { service, paymentMethodsService } = createService();
    const { customer, bookingId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const result = await service.requestBookingQuote(customer, bookingId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Matches pricing-table.test.ts's known plumbing/scheduled value.
    expect(result.quote.totalCents).toBe(22750);
  });

  it('is idempotent: a second request within the expiry window returns the same quoteId', async () => {
    const { service, paymentMethodsService } = createService();
    const { customer, bookingId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const first = await service.requestBookingQuote(customer, bookingId);
    const second = await service.requestBookingQuote(customer, bookingId);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.quote.quoteId).toBe(first.quote.quoteId);
  });

  it('returns 403 when the assigned provider requests a quote (customer-only, not party-based)', async () => {
    const { service, paymentMethodsService } = createService();
    const { provider, bookingId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const result = await service.requestBookingQuote(provider, bookingId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);
  });

  it('returns 409 when the booking is not yet accepted', async () => {
    const { service, paymentMethodsService } = createService();
    const customer = createSession('customer', 'customer-1');
    const created = await service.createBooking(customer, { requestedService: 'Plumbing' });
    if (!created.ok) throw new Error('setup failed');
    void paymentMethodsService;

    const result = await service.requestBookingQuote(customer, created.booking.bookingId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(409);
  });

  it('stays atomic under concurrent requests: two simultaneous quote requests return the same quoteId', async () => {
    const { service, paymentMethodsService } = createService();
    const { customer, bookingId } = await setUpAcceptedBooking(service, paymentMethodsService);

    // getOrCreateActiveQuote returns exactly what it found-or-wrote, with no `await`
    // between the check and the write (see in-memory-quote.repository.ts) -- so two
    // concurrent calls returning the same quoteId is only possible if exactly one
    // quote was ever created for this booking, not two "active" quotes racing.
    const [first, second] = await Promise.all([
      service.requestBookingQuote(customer, bookingId),
      service.requestBookingQuote(customer, bookingId),
    ]);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.quote.quoteId).toBe(first.quote.quoteId);
  });

  it('does not resurrect an expired quote: a new request after expiry creates a fresh quote', async () => {
    const { service, paymentMethodsService, quoteRepository } = createService();
    const { bookingId, customer } = await setUpAcceptedBooking(service, paymentMethodsService);

    const pastCreatedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const pastExpiresAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const expiredQuote = await quoteRepository.createQuote({
      bookingId,
      customerUserId: customer.userId,
      lineItems: [],
      calloutFeeCents: 4500,
      laborCents: 17000,
      platformFeeCents: 1250,
      totalCents: 22750,
      currency: 'EUR',
      pricingTableVersion: 'v1',
      createdAt: pastCreatedAt,
      expiresAt: pastExpiresAt,
    });

    const result = await service.requestBookingQuote(customer, bookingId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.quoteId).not.toBe(expiredQuote.quoteId);
  });
});

describe('BookingsService.checkoutBooking', () => {
  it('captures payment for the quote\'s frozen total', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const { customer, bookingId, paymentMethodId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const quote = await service.requestBookingQuote(customer, bookingId);
    if (!quote.ok) throw new Error('setup failed: requestBookingQuote');

    const result = await service.checkoutBooking(customer, bookingId, {
      quoteId: quote.quote.quoteId,
      paymentMethodId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payment.amountCents).toBe(22750);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment?.paymentId).toBe(result.payment.paymentId);
  });

  it('returns 403 when the assigned provider attempts checkout (customer-only, not party-based)', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const { customer, provider, bookingId, paymentMethodId } = await setUpAcceptedBooking(
      service,
      paymentMethodsService,
    );

    const quote = await service.requestBookingQuote(customer, bookingId);
    if (!quote.ok) throw new Error('setup failed');

    const result = await service.checkoutBooking(provider, bookingId, {
      quoteId: quote.quote.quoteId,
      paymentMethodId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment).toBeNull();
  });

  it('rejects a nonexistent quoteId with 409 and does not capture payment', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const { customer, bookingId, paymentMethodId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const result = await service.checkoutBooking(customer, bookingId, {
      quoteId: 'expired-quote-does-not-exist',
      paymentMethodId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(409);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment).toBeNull();
  });

  it('rejects a genuinely expired quote (past expiresAt) with 409 and does not capture payment', async () => {
    const { service, paymentsService, paymentMethodsService, quoteRepository } = createService();
    const { customer, bookingId, paymentMethodId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const expiredQuote = await quoteRepository.createQuote({
      bookingId,
      customerUserId: customer.userId,
      lineItems: [],
      calloutFeeCents: 4500,
      laborCents: 17000,
      platformFeeCents: 1250,
      totalCents: 22750,
      currency: 'EUR',
      pricingTableVersion: 'v1',
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    const result = await service.checkoutBooking(customer, bookingId, {
      quoteId: expiredQuote.quoteId,
      paymentMethodId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(409);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment).toBeNull();
  });

  it('rejects a quote issued for a different booking with 409', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const bookingA = await setUpAcceptedBooking(service, paymentMethodsService);

    const provider2 = createSession('provider', 'provider-2');
    const customer2 = createSession('customer', 'customer-2');
    const createdB = await service.createBooking(customer2, {
      requestedService: 'Second booking',
      serviceCategory: 'plumbing',
      urgency: 'scheduled',
    });
    if (!createdB.ok) throw new Error('setup failed');
    await service.acceptBooking(provider2, createdB.booking.bookingId);

    const quoteForBookingB = await service.requestBookingQuote(customer2, createdB.booking.bookingId);
    if (!quoteForBookingB.ok) throw new Error('setup failed');

    const result = await service.checkoutBooking(bookingA.customer, bookingA.bookingId, {
      quoteId: quoteForBookingB.quote.quoteId,
      paymentMethodId: bookingA.paymentMethodId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(409);

    const payment = await paymentsService.getPaymentByBookingId(bookingA.bookingId);
    expect(payment).toBeNull();
  });

  it('rejects a payment method not owned by the caller with 403', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const { customer, bookingId } = await setUpAcceptedBooking(service, paymentMethodsService);

    const otherCustomer = createSession('customer', 'customer-2');
    const otherMethod = await paymentMethodsService.addPaymentMethod(otherCustomer, { label: 'Not yours' });
    if (!otherMethod.ok) throw new Error('setup failed');

    const quote = await service.requestBookingQuote(customer, bookingId);
    if (!quote.ok) throw new Error('setup failed');

    const result = await service.checkoutBooking(customer, bookingId, {
      quoteId: quote.quote.quoteId,
      paymentMethodId: otherMethod.paymentMethod.paymentMethodId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment).toBeNull();
  });

  it('reconciles with completeBooking: checkout then complete results in exactly one payment/payout/invoice record', async () => {
    const { service, paymentsService, paymentMethodsService, payoutRepository, invoiceRepository } =
      createService();
    const { customer, provider, bookingId, paymentMethodId } = await setUpAcceptedBooking(
      service,
      paymentMethodsService,
    );

    const quote = await service.requestBookingQuote(customer, bookingId);
    if (!quote.ok) throw new Error('setup failed');

    const checkoutResult = await service.checkoutBooking(customer, bookingId, {
      quoteId: quote.quote.quoteId,
      paymentMethodId,
    });
    if (!checkoutResult.ok) throw new Error('checkout failed');

    const payoutAfterCheckout = await payoutRepository.findPayoutByBookingId(bookingId);
    const invoiceAfterCheckout = await invoiceRepository.findInvoiceByBookingId(bookingId);
    expect(payoutAfterCheckout).not.toBeNull();
    expect(invoiceAfterCheckout).not.toBeNull();

    const completeResult = await service.completeBooking(provider, bookingId);
    expect(completeResult.ok).toBe(true);
    if (!completeResult.ok) return;

    // Same payment, not a second one.
    expect(completeResult.payment.paymentId).toBe(checkoutResult.payment.paymentId);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment?.paymentId).toBe(checkoutResult.payment.paymentId);

    // Same payout/invoice record survives completion -- not a second write.
    const payoutAfterComplete = await payoutRepository.findPayoutByBookingId(bookingId);
    const invoiceAfterComplete = await invoiceRepository.findInvoiceByBookingId(bookingId);
    expect(payoutAfterComplete?.payoutId).toBe(payoutAfterCheckout?.payoutId);
    expect(invoiceAfterComplete?.invoiceId).toBe(invoiceAfterCheckout?.invoiceId);
  });

  it('reconciles the other ordering: completeBooking then checkout is rejected 409, not a second payment', async () => {
    const { service, paymentsService, paymentMethodsService } = createService();
    const { customer, provider, bookingId, paymentMethodId } = await setUpAcceptedBooking(
      service,
      paymentMethodsService,
    );

    const completeResult = await service.completeBooking(provider, bookingId);
    if (!completeResult.ok) throw new Error('setup failed: completeBooking');

    const quote = await service.requestBookingQuote(customer, bookingId);
    // Booking is now 'completed', not 'accepted' -- quote request itself must 409.
    expect(quote.ok).toBe(false);
    if (quote.ok) return;
    expect(quote.statusCode).toBe(409);

    const checkoutResult = await service.checkoutBooking(customer, bookingId, {
      quoteId: 'irrelevant-since-quote-was-never-issued',
      paymentMethodId,
    });
    expect(checkoutResult.ok).toBe(false);
    if (checkoutResult.ok) return;
    expect(checkoutResult.statusCode).toBe(409);

    const payment = await paymentsService.getPaymentByBookingId(bookingId);
    expect(payment?.paymentId).toBe(completeResult.payment.paymentId);
  });
});
