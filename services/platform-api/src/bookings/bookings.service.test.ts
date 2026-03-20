import type { BookingAcceptedDomainEvent } from '@quickwerk/domain';
import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BookingDomainEventPublisher } from '../orchestration/domain-event.publisher';
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
  const eventPublisher: BookingDomainEventPublisher = {
    async publishBookingAccepted(event) {
      emittedEvents.push(event);
    },
  };

  return {
    emittedEvents,
    service: new BookingsService(new InMemoryBookingRepository(), eventPublisher),
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
      expect(replayedAccept.booking.statusHistory).toHaveLength(2);
    }

    const conflictingAccept = await service.acceptBooking(providerB, created.booking.bookingId);
    expect(conflictingAccept.ok).toBe(false);
    if (!conflictingAccept.ok) {
      expect(conflictingAccept.statusCode).toBe(409);
      expect(conflictingAccept.error).toContain('accepted');
    }
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
});
