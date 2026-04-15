import type { BookingAcceptedDomainEvent, BookingDeclinedDomainEvent } from '@quickwerk/domain';
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
  const emittedEvents: BookingAcceptedDomainEvent[] = [];
  const declinedEvents: BookingDeclinedDomainEvent[] = [];
  const eventPublisher: BookingDomainEventPublisher = {
    async publishBookingAccepted(event) {
      emittedEvents.push(event);
    },
    async publishBookingDeclined(event) {
      declinedEvents.push(event);
    },
    async publishPaymentCaptured(_event) {},
  };
  const paymentsService = new PaymentsService(
    new InMemoryPaymentRepository(),
    new PayoutsService(new InMemoryPayoutRepository()),
    new InvoicesService(new InMemoryInvoiceRepository()),
  );

  return {
    emittedEvents,
    declinedEvents,
    service: new BookingsService(new InMemoryBookingRepository(), eventPublisher, paymentsService),
  };
};

describe('BookingsService', () => {
  it('enforces role auth for create and accept flows', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');
    const customer = createSession('customer', 'customer-1');

    const createAsProvider = await service.createBooking(provider, {
      requestedService: 'Plumbing',
    });
    expect(createAsProvider.ok).toBe(false);
    if (!createAsProvider.ok) {
      expect(createAsProvider.statusCode).toBe(403);
    }

    const created = await service.createBooking(customer, {
      requestedService: 'Plumbing',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.booking.status).toBe('submitted');
    expect(created.booking.statusHistory).toHaveLength(1);

    const acceptAsCustomer = await service.acceptBooking(customer, created.booking.bookingId);
    expect(acceptAsCustomer.ok).toBe(false);
    if (!acceptAsCustomer.ok) {
      expect(acceptAsCustomer.statusCode).toBe(403);
    }
  });

  it('keeps accept idempotent for retry by the same provider and conflicts for another provider', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const providerA = createSession('provider', 'provider-1');
    const providerB = createSession('provider', 'provider-2');

    const created = await service.createBooking(customer, {
      requestedService: 'Electric repair',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const accepted = await service.acceptBooking(providerA, created.booking.bookingId);
    expect(accepted.ok).toBe(true);

    const replayedAccept = await service.acceptBooking(providerA, created.booking.bookingId);
    expect(replayedAccept.ok).toBe(true);
    if (replayedAccept.ok) {
      expect(replayedAccept.booking.status).toBe('accepted');
      expect(replayedAccept.booking.providerUserId).toBe('provider-1');
      // Replay must NOT add a new statusHistory entry
      expect(replayedAccept.booking.statusHistory).toHaveLength(2);
    }

    const conflictingAccept = await service.acceptBooking(providerB, created.booking.bookingId);
    expect(conflictingAccept.ok).toBe(false);
    if (!conflictingAccept.ok) {
      expect(conflictingAccept.statusCode).toBe(409);
      expect(conflictingAccept.error).toContain('accepted');
    }
  });

  it('preserves customerLocation when creating a booking', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');

    const created = await service.createBooking(customer, {
      requestedService: 'Leak diagnosis',
      customerLocation: '  1010 Vienna, AT  ',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.booking.customerLocation).toBe('1010 Vienna, AT');
  });

  it('handles near-simultaneous provider accept attempts deterministically', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const providers = [
      createSession('provider', 'provider-1'),
      createSession('provider', 'provider-2'),
    ] as const;

    const created = await service.createBooking(customer, {
      requestedService: 'Door lock change',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const [attemptA, attemptB] = await Promise.all([
      service.acceptBooking(providers[0], created.booking.bookingId),
      service.acceptBooking(providers[1], created.booking.bookingId),
    ]);

    const successful = [attemptA, attemptB].filter((attempt) => attempt.ok);
    const conflicted = [attemptA, attemptB].filter((attempt) => !attempt.ok);

    expect(successful).toHaveLength(1);
    expect(conflicted).toHaveLength(1);

    if (successful[0]?.ok) {
      expect(successful[0].booking.status).toBe('accepted');
    }

    if (conflicted[0] && !conflicted[0].ok) {
      expect(conflicted[0].statusCode).toBe(409);
      expect(conflicted[0].error).toContain('accepted');
    }
  });

  it('returns not-found when accepting an unknown booking', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');

    const result = await service.acceptBooking(provider, 'missing-booking-id');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(404);
    }
  });

  it('listBookings — provider sees all submitted bookings, customer sees only their own', async () => {
    const { service } = createService();
    const customer1 = createSession('customer', 'customer-1');
    const customer2 = createSession('customer', 'customer-2');
    const provider = createSession('provider', 'provider-1');

    // customer1 creates two bookings
    const created1 = await service.createBooking(customer1, { requestedService: 'Plumbing' });
    const created2 = await service.createBooking(customer1, { requestedService: 'Electric repair' });
    // customer2 creates one booking
    const created3 = await service.createBooking(customer2, { requestedService: 'Painting' });

    expect(created1.ok).toBe(true);
    expect(created2.ok).toBe(true);
    expect(created3.ok).toBe(true);

    // provider sees all 3 submitted
    const providerList = await service.listBookings(provider);
    expect(providerList).toHaveLength(3);
    expect(providerList.every((b) => b.status === 'submitted')).toBe(true);

    // customer1 sees only their 2
    const customer1List = await service.listBookings(customer1);
    expect(customer1List).toHaveLength(2);
    expect(customer1List.every((b) => b.customerUserId === 'customer-1')).toBe(true);

    // customer2 sees only their 1
    const customer2List = await service.listBookings(customer2);
    expect(customer2List).toHaveLength(1);
    expect(customer2List[0]?.customerUserId).toBe('customer-2');
  });

  it('listBookings — provider does not see accepted bookings', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Door lock change' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // accept the booking
    await service.acceptBooking(provider, created.booking.bookingId);

    // provider list should be empty now
    const providerList = await service.listBookings(provider);
    expect(providerList).toHaveLength(0);

    // customer should still see their accepted booking
    const customerList = await service.listBookings(customer);
    expect(customerList).toHaveLength(1);
    expect(customerList[0]?.status).toBe('accepted');
  });

  it('listBookings — returns empty array when no bookings exist', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');
    const customer = createSession('customer', 'customer-1');

    expect(await service.listBookings(provider)).toEqual([]);
    expect(await service.listBookings(customer)).toEqual([]);
  });

  it('getBooking — customer can read own booking, provider can read any booking', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Window fix' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const asCustomer = await service.getBooking(customer, created.booking.bookingId);
    expect(asCustomer.ok).toBe(true);

    const asProvider = await service.getBooking(provider, created.booking.bookingId);
    expect(asProvider.ok).toBe(true);
  });

  it('getBooking — customer cannot read another customer booking', async () => {
    const { service } = createService();
    const customer1 = createSession('customer', 'customer-1');
    const customer2 = createSession('customer', 'customer-2');

    const created = await service.createBooking(customer1, { requestedService: 'Window fix' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const forbidden = await service.getBooking(customer2, created.booking.bookingId);
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) {
      expect(forbidden.statusCode).toBe(403);
    }
  });

  it('getBooking — returns not found for unknown booking id', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');

    const missing = await service.getBooking(provider, 'missing-booking-id');
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.statusCode).toBe(404);
    }
  });

  it('emits booking accepted domain events with correlation breadcrumbs', async () => {
    const { service, emittedEvents } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, {
      requestedService: 'Heating repair',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const firstAccept = await service.acceptBooking(provider, created.booking.bookingId, {
      correlationId: 'corr-request-1',
    });
    const replayedAccept = await service.acceptBooking(provider, created.booking.bookingId, {
      correlationId: 'corr-request-2',
    });

    expect(firstAccept.ok).toBe(true);
    expect(replayedAccept.ok).toBe(true);
    expect(emittedEvents).toHaveLength(2);
    expect(emittedEvents[0]?.correlationId).toBe('corr-request-1');
    expect(emittedEvents[0]?.replayed).toBe(false);
    expect(emittedEvents[1]?.correlationId).toBe('corr-request-2');
    expect(emittedEvents[1]?.replayed).toBe(true);
  });

  // --- Phase 2: Decline ---

  it('declineBooking — provider can decline a submitted booking', async () => {
    const { service, declinedEvents } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Tile repair' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const declined = await service.declineBooking(
      provider,
      created.booking.bookingId,
      { declineReason: 'Outside service area' },
      { correlationId: 'corr-decline-1' },
    );

    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.booking.status).toBe('declined');
    expect(declined.booking.declineReason).toBe('Outside service area');
    expect(declined.booking.statusHistory).toHaveLength(2);
    expect(declinedEvents).toHaveLength(1);
    expect(declinedEvents[0]?.booking.status).toBe('declined');
    expect(declinedEvents[0]?.booking.declineReason).toBe('Outside service area');
    expect(declinedEvents[0]?.correlationId).toBe('corr-decline-1');
  });

  it('declineBooking — customer cannot decline a booking', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');

    const created = await service.createBooking(customer, { requestedService: 'Tile repair' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const declined = await service.declineBooking(customer, created.booking.bookingId, {});
    expect(declined.ok).toBe(false);
    if (!declined.ok) {
      expect(declined.statusCode).toBe(403);
    }
  });

  it('declineBooking — returns 404 for unknown booking', async () => {
    const { service } = createService();
    const provider = createSession('provider', 'provider-1');

    const declined = await service.declineBooking(provider, 'missing-id', {});
    expect(declined.ok).toBe(false);
    if (!declined.ok) {
      expect(declined.statusCode).toBe(404);
    }
  });

  it('declineBooking — returns 409 when booking is already accepted', async () => {
    const { service } = createService();
    const customer = createSession('customer', 'customer-1');
    const providerA = createSession('provider', 'provider-1');
    const providerB = createSession('provider', 'provider-2');

    const created = await service.createBooking(customer, { requestedService: 'Roofing' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.acceptBooking(providerA, created.booking.bookingId);

    const declined = await service.declineBooking(providerB, created.booking.bookingId, {});
    expect(declined.ok).toBe(false);
    if (!declined.ok) {
      expect(declined.statusCode).toBe(409);
    }
  });

  it('declineBooking — is idempotent for the same provider', async () => {
    const { service, declinedEvents } = createService();
    const customer = createSession('customer', 'customer-1');
    const provider = createSession('provider', 'provider-1');

    const created = await service.createBooking(customer, { requestedService: 'Flooring' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.declineBooking(provider, created.booking.bookingId, {});
    const replay = await service.declineBooking(provider, created.booking.bookingId, {});

    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.booking.status).toBe('declined');
    }
    expect(declinedEvents).toHaveLength(2);
    expect(declinedEvents[1]?.replayed).toBe(true);
  });
});
