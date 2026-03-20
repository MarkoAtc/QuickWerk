import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { BookingsService } from './bookings.service';
import { InMemoryBookingRepository } from './infrastructure/in-memory-booking.repository';

const createSession = (role: AuthSession['role'], userId: string): AuthSession => ({
  createdAt: new Date().toISOString(),
  email: `${role}@quickwerk.local`,
  role,
  token: `${role}-token`,
  userId,
});

describe('BookingsService', () => {
  it('enforces role auth for create and accept flows', async () => {
    const service = new BookingsService(new InMemoryBookingRepository());
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

  it('prevents conflicting accept transitions for the same booking', async () => {
    const service = new BookingsService(new InMemoryBookingRepository());
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
    if (accepted.ok) {
      expect(accepted.booking.status).toBe('accepted');
      expect(accepted.booking.providerUserId).toBe('provider-1');
    }

    const conflictingAccept = await service.acceptBooking(providerB, created.booking.bookingId);
    expect(conflictingAccept.ok).toBe(false);
    if (!conflictingAccept.ok) {
      expect(conflictingAccept.statusCode).toBe(409);
      expect(conflictingAccept.error).toContain('accepted');
    }
  });

  it('returns not-found when accepting an unknown booking', async () => {
    const service = new BookingsService(new InMemoryBookingRepository());
    const provider = createSession('provider', 'provider-1');

    const result = await service.acceptBooking(provider, 'missing-booking-id');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(404);
    }
  });
});
