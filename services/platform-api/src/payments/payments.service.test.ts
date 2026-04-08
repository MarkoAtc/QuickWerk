import { describe, expect, it } from 'vitest';

import { InMemoryInvoiceRepository } from '../invoices/infrastructure/in-memory-invoice.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { InMemoryPayoutRepository } from '../payouts/infrastructure/in-memory-payout.repository';
import { PayoutsService } from '../payouts/payouts.service';
import { InMemoryPaymentRepository } from './infrastructure/in-memory-payment.repository';
import { PaymentsService } from './payments.service';

const createService = () =>
  new PaymentsService(
    new InMemoryPaymentRepository(),
    new PayoutsService(new InMemoryPayoutRepository()),
    new InvoicesService(new InMemoryInvoiceRepository()),
  );

describe('PaymentsService', () => {
  it('captures a payment and returns a payment record', async () => {
    const service = createService();
    const { payment, replayed } = await service.capturePaymentForBooking({
      bookingId: 'booking-1',
      customerUserId: 'customer-1',
      providerUserId: 'provider-1',
      amountCents: 0,
      currency: 'EUR',
      capturedAt: '2026-03-31T12:00:00.000Z',
      correlationId: 'corr-test',
      requestedService: 'Plumbing',
    });

    expect(payment.paymentId).toBeDefined();
    expect(payment.bookingId).toBe('booking-1');
    expect(payment.status).toBe('captured');
    expect(payment.currency).toBe('EUR');
    expect(payment.amountCents).toBe(0);
    expect(replayed).toBe(false);
  });

  it('returns the same payment on duplicate capture (idempotent)', async () => {
    const service = createService();
    const input = {
      bookingId: 'booking-2',
      customerUserId: 'customer-1',
      providerUserId: 'provider-1',
      amountCents: 0,
      currency: 'EUR',
      capturedAt: '2026-03-31T12:00:00.000Z',
      correlationId: 'corr-test',
      requestedService: 'Plumbing',
    };

    const first = await service.capturePaymentForBooking(input);
    const second = await service.capturePaymentForBooking(input);

    expect(second.replayed).toBe(true);
    expect(second.payment.paymentId).toBe(first.payment.paymentId);
  });

  it('returns null when no payment exists for booking', async () => {
    const service = createService();
    const payment = await service.getPaymentByBookingId('nonexistent-booking');

    expect(payment).toBeNull();
  });

  it('retrieves payment by bookingId after capture', async () => {
    const service = createService();
    const { payment: created } = await service.capturePaymentForBooking({
      bookingId: 'booking-3',
      customerUserId: 'customer-1',
      providerUserId: 'provider-1',
      amountCents: 0,
      currency: 'EUR',
      capturedAt: '2026-03-31T12:00:00.000Z',
      correlationId: 'corr-test',
      requestedService: 'Plumbing',
    });

    const found = await service.getPaymentByBookingId('booking-3');
    expect(found).not.toBeNull();
    expect(found?.paymentId).toBe(created.paymentId);
  });

  it('throws when requestedService is blank', async () => {
    const service = createService();

    await expect(
      service.capturePaymentForBooking({
        bookingId: 'booking-4',
        customerUserId: 'customer-1',
        providerUserId: 'provider-1',
        amountCents: 0,
        currency: 'EUR',
        capturedAt: '2026-03-31T12:00:00.000Z',
        correlationId: 'corr-test',
        requestedService: '   ',
      }),
    ).rejects.toThrow('missing requestedService');
  });
});
