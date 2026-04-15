import type {
  BookingAcceptedDomainEvent,
  BookingCompletedDomainEvent,
  BookingCreatedDomainEvent,
  BookingDeclinedDomainEvent,
  PaymentCapturedDomainEvent,
} from '@quickwerk/domain';
import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BookingDomainEventPublisher } from '../orchestration/domain-event.publisher';
import { InMemoryInvoiceRepository } from '../invoices/infrastructure/in-memory-invoice.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { InMemoryPaymentRepository } from '../payments/infrastructure/in-memory-payment.repository';
import { PaymentsService } from '../payments/payments.service';
import { InMemoryPayoutRepository } from '../payouts/infrastructure/in-memory-payout.repository';
import { PayoutsService } from '../payouts/payouts.service';
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

const createService = () => {
  const createdEvents: BookingCreatedDomainEvent[] = [];
  const completedEvents: BookingCompletedDomainEvent[] = [];
  const paymentCapturedEvents: PaymentCapturedDomainEvent[] = [];
  const eventPublisher: BookingDomainEventPublisher = {
    async publishBookingCreated(event: BookingCreatedDomainEvent) {
      createdEvents.push(event);
    },
    async publishBookingAccepted(_event: BookingAcceptedDomainEvent) {},
    async publishBookingDeclined(_event: BookingDeclinedDomainEvent) {},
    async publishBookingCompleted(event: BookingCompletedDomainEvent) {
      completedEvents.push(event);
    },
    async publishPaymentCaptured(event: PaymentCapturedDomainEvent) {
      paymentCapturedEvents.push(event);
    },
  };
  const paymentsService = new PaymentsService(
    new InMemoryPaymentRepository(),
    new PayoutsService(new InMemoryPayoutRepository()),
    new InvoicesService(new InMemoryInvoiceRepository()),
  );
  return {
    service: new BookingsService(new InMemoryBookingRepository(), eventPublisher, paymentsService),
    paymentsService,
    createdEvents,
    completedEvents,
    paymentCapturedEvents,
  };
};

describe('BookingsService.completeBooking', () => {
  it('returns 403 when customer attempts to complete a booking', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const result = await service.completeBooking(customer, 'booking-xyz');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);
  });

  it('returns 404 when booking does not exist', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');
    const result = await service.completeBooking(provider, 'nonexistent-id');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(404);
  });

  it('returns 409 when booking is not in accepted status', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Plumbing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // Booking is 'submitted' — provider cannot complete without first accepting
    const result = await service.completeBooking(provider, created.booking.bookingId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(409);
  });

  it('completes an accepted booking and creates a payment record', async () => {
    const { service, paymentsService, completedEvents, paymentCapturedEvents } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Tile repair' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.completeBooking(provider, created.booking.bookingId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.booking.status).toBe('completed');
    expect(result.payment.bookingId).toBe(created.booking.bookingId);
    expect(result.payment.status).toBe('captured');
    expect(result.payment.currency).toBe('EUR');
    expect(result.payment.amountCents).toBeGreaterThan(0);

    // Payment should be retrievable
    const payment = await paymentsService.getPaymentByBookingId(created.booking.bookingId);
    expect(payment).not.toBeNull();
    expect(payment?.paymentId).toBe(result.payment.paymentId);
    expect(completedEvents).toHaveLength(1);
    expect(completedEvents[0]?.booking.status).toBe('completed');
    expect(paymentCapturedEvents).toHaveLength(1);
  });

  it('idempotent: completing again by same provider returns 200 with replayed payment', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Plumbing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(provider, created.booking.bookingId);
    await service.completeBooking(provider, created.booking.bookingId);

    const again = await service.completeBooking(provider, created.booking.bookingId);
    expect(again.ok).toBe(true);
    if (!again.ok) return;

    expect(again.booking.status).toBe('completed');
  });
});

describe('BookingsService.getBookingPayment', () => {
  it('returns 404 when booking does not exist', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const result = await service.getBookingPayment(customer, 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(404);
  });

  it('returns 404 when booking exists but has no payment', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Plumbing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(provider, created.booking.bookingId);

    const result = await service.getBookingPayment(customer, created.booking.bookingId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(404);
  });

  it('returns 403 when customer accesses another customer booking', async () => {
    const { service } = createService();
    const customerA = createSession('customer', 'customer-a');
    const customerB = createSession('customer', 'customer-b');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customerA, { requestedService: 'Plumbing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(provider, created.booking.bookingId);
    await service.completeBooking(provider, created.booking.bookingId);

    const result = await service.getBookingPayment(customerB, created.booking.bookingId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);
  });

  it('returns payment for booking owner', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Plumbing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(provider, created.booking.bookingId);
    const completed = await service.completeBooking(provider, created.booking.bookingId);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    const result = await service.getBookingPayment(customer, created.booking.bookingId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payment.bookingId).toBe(created.booking.bookingId);
    expect(result.payment.status).toBe('captured');
  });
});
