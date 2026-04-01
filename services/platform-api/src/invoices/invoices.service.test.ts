import { describe, expect, it } from 'vitest';

import type { PaymentRecord } from '@quickwerk/domain';

import { InMemoryInvoiceRepository } from './infrastructure/in-memory-invoice.repository';
import { BookingContext, InvoicesService } from './invoices.service';

const createService = () => new InvoicesService(new InMemoryInvoiceRepository());

const makePayment = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  paymentId: 'payment-1',
  bookingId: 'booking-1',
  customerUserId: 'customer-1',
  providerUserId: 'provider-1',
  amountCents: 7500,
  currency: 'EUR',
  status: 'captured',
  capturedAt: '2026-04-01T12:00:00.000Z',
  correlationId: 'corr-test',
  ...overrides,
});

const makeBookingContext = (overrides: Partial<BookingContext> = {}): BookingContext => ({
  bookingId: 'booking-1',
  customerUserId: 'customer-1',
  providerUserId: 'provider-1',
  requestedService: 'Plumbing repair',
  ...overrides,
});

const makeSession = (userId: string, role: 'customer' | 'provider') => {
  const createdAt = new Date();
  return {
    userId,
    role,
    token: `tok-${userId}`,
    email: `${userId}@quickwerk.local`,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 3600000).toISOString(),
  };
};

describe('InvoicesService', () => {
  describe('generateInvoiceForBooking', () => {
    it('creates an invoice with correct line item from booking and payment', async () => {
      const service = createService();
      const booking = makeBookingContext();
      const payment = makePayment();

      const invoice = await service.generateInvoiceForBooking(booking, payment, 'corr-test');

      expect(invoice.invoiceId).toBeDefined();
      expect(invoice.bookingId).toBe('booking-1');
      expect(invoice.customerUserId).toBe('customer-1');
      expect(invoice.providerUserId).toBe('provider-1');
      expect(invoice.status).toBe('issued');
      expect(invoice.issuedAt).not.toBeNull();
      expect(invoice.pdfUrl).toBeNull();
      expect(invoice.currency).toBe('EUR');
      expect(invoice.subtotalCents).toBe(7500);
      expect(invoice.taxCents).toBe(0);
      expect(invoice.totalCents).toBe(7500);
      expect(invoice.lineItems).toHaveLength(1);
      expect(invoice.lineItems[0].description).toBe('Job: Plumbing repair');
      expect(invoice.lineItems[0].quantity).toBe(1);
      expect(invoice.lineItems[0].unitAmountCents).toBe(7500);
      expect(invoice.lineItems[0].totalAmountCents).toBe(7500);
    });

    it('returns existing invoice for same bookingId (idempotent)', async () => {
      const service = createService();
      const booking = makeBookingContext();
      const payment = makePayment();

      const first = await service.generateInvoiceForBooking(booking, payment, 'corr-test');
      const second = await service.generateInvoiceForBooking(booking, payment, 'corr-test');

      expect(second.invoiceId).toBe(first.invoiceId);
    });

    it('correctly calculates line item totals for different amounts', async () => {
      const service = createService();
      const booking = makeBookingContext({ bookingId: 'booking-2', requestedService: 'Electrical work' });
      const payment = makePayment({ bookingId: 'booking-2', amountCents: 12000 });

      const invoice = await service.generateInvoiceForBooking(booking, payment, 'corr-test');

      expect(invoice.subtotalCents).toBe(12000);
      expect(invoice.totalCents).toBe(12000);
      expect(invoice.lineItems[0].unitAmountCents).toBe(12000);
      expect(invoice.lineItems[0].totalAmountCents).toBe(12000);
      expect(invoice.lineItems[0].description).toBe('Job: Electrical work');
    });
  });

  describe('getInvoiceByBookingId', () => {
    it('returns invoice for the customer on the booking', async () => {
      const service = createService();
      const booking = makeBookingContext();
      const payment = makePayment();

      const created = await service.generateInvoiceForBooking(booking, payment, 'corr-test');
      const result = await service.getInvoiceByBookingId(makeSession('customer-1', 'customer'), 'booking-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.invoice.invoiceId).toBe(created.invoiceId);
      }
    });

    it('returns invoice for the provider on the booking', async () => {
      const service = createService();
      const booking = makeBookingContext();
      const payment = makePayment();

      await service.generateInvoiceForBooking(booking, payment, 'corr-test');
      const result = await service.getInvoiceByBookingId(makeSession('provider-1', 'provider'), 'booking-1');

      expect(result.ok).toBe(true);
    });

    it('returns 404 when no invoice exists for booking', async () => {
      const service = createService();
      const result = await service.getInvoiceByBookingId(makeSession('customer-1', 'customer'), 'nonexistent-booking');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(404);
      }
    });

    it('returns 403 when user is not participant on the booking', async () => {
      const service = createService();
      const booking = makeBookingContext();
      const payment = makePayment();

      await service.generateInvoiceForBooking(booking, payment, 'corr-test');

      const result = await service.getInvoiceByBookingId(makeSession('other-customer', 'customer'), 'booking-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.statusCode).toBe(403);
      }
    });
  });
});
