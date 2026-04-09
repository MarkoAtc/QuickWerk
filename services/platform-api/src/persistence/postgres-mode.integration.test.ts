import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PostgresAuthSessionRepository } from '../auth/infrastructure/postgres-auth-session.repository';
import { PostgresBookingRepository } from '../bookings/infrastructure/postgres-booking.repository';
import { PostgresDisputeRepository } from '../disputes/infrastructure/postgres-dispute.repository';
import { PostgresClient } from './postgres-client';

const shouldRun = process.env.RUN_POSTGRES_INTEGRATION_TESTS === '1';
const databaseUrl = process.env.DATABASE_URL;

describe.runIf(shouldRun && Boolean(databaseUrl))('postgres mode integration (optional)', () => {
  const postgresClient = new PostgresClient();
  const config = {
    databaseUrl: databaseUrl as string,
  };

  const authRepository = new PostgresAuthSessionRepository(postgresClient, config);
  const bookingRepository = new PostgresBookingRepository(postgresClient, config);
  const disputeRepository = new PostgresDisputeRepository(postgresClient, config);

  beforeAll(async () => {
    await postgresClient.query(
      config,
      'TRUNCATE TABLE disputes, booking_status_history, bookings, sessions, users RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await postgresClient.onApplicationShutdown();
  });

  it('persists auth and booking transitions end-to-end', async () => {
    const customerSession = await authRepository.createSession({
      email: 'integration.customer@quickwerk.local',
      role: 'customer',
    });

    const providerSession = await authRepository.createSession({
      email: 'integration.provider@quickwerk.local',
      role: 'provider',
    });

    const resolvedCustomerSession = await authRepository.resolveSession(customerSession.token);
    expect(resolvedCustomerSession?.email).toBe('integration.customer@quickwerk.local');

    const createdBooking = await bookingRepository.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: customerSession.userId,
      requestedService: 'Integration service',
      actorRole: 'customer',
      actorUserId: customerSession.userId,
    });

    const acceptedBooking = await bookingRepository.acceptSubmittedBooking({
      bookingId: createdBooking.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: providerSession.userId,
      actorRole: 'provider',
      actorUserId: providerSession.userId,
    });

    expect(acceptedBooking.ok).toBe(true);
    if (acceptedBooking.ok) {
      expect(acceptedBooking.booking.status).toBe('accepted');
      expect(acceptedBooking.booking.statusHistory).toHaveLength(2);
    }

    const replayedAccept = await bookingRepository.acceptSubmittedBooking({
      bookingId: createdBooking.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: providerSession.userId,
      actorRole: 'provider',
      actorUserId: providerSession.userId,
    });

    expect(replayedAccept.ok).toBe(true);
    if (replayedAccept.ok) {
      expect(replayedAccept.replayed).toBe(true);
      expect(replayedAccept.booking.statusHistory).toHaveLength(2);
    }

    const conflictingProviderSession = await authRepository.createSession({
      email: 'integration.provider-2@quickwerk.local',
      role: 'provider',
    });

    const conflictingAccept = await bookingRepository.acceptSubmittedBooking({
      bookingId: createdBooking.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: conflictingProviderSession.userId,
      actorRole: 'provider',
      actorUserId: conflictingProviderSession.userId,
    });

    expect(conflictingAccept).toEqual({
      ok: false,
      reason: 'transition-conflict',
      currentStatus: 'accepted',
      currentProviderUserId: providerSession.userId,
    });

    await expect(authRepository.deleteSession(customerSession.token)).resolves.toBe(true);
    await expect(authRepository.resolveSession(customerSession.token)).resolves.toBeNull();
  });

  it('persists dispute transitions end-to-end', async () => {
    const customerSession = await authRepository.createSession({
      email: 'integration.dispute.customer@quickwerk.local',
      role: 'customer',
    });

    const providerSession = await authRepository.createSession({
      email: 'integration.dispute.provider@quickwerk.local',
      role: 'provider',
    });

    const booking = await bookingRepository.createSubmittedBooking({
      createdAt: new Date().toISOString(),
      customerUserId: customerSession.userId,
      requestedService: 'Dispute integration service',
      actorRole: 'customer',
      actorUserId: customerSession.userId,
    });

    await bookingRepository.acceptSubmittedBooking({
      bookingId: booking.bookingId,
      acceptedAt: new Date().toISOString(),
      providerUserId: providerSession.userId,
      actorRole: 'provider',
      actorUserId: providerSession.userId,
    });

    const disputeId = '0f8fad5b-d9cb-469f-a165-70867728950e';
    await disputeRepository.save({
      disputeId,
      bookingId: booking.bookingId,
      reporterUserId: customerSession.userId,
      reporterRole: 'customer',
      category: 'quality',
      description: 'Integration dispute.',
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionNote: null,
    });

    const reviewTransition = await disputeRepository.transitionStatus({
      disputeId,
      allowedCurrentStatuses: ['open'],
      nextStatus: 'under-review',
    });
    expect(reviewTransition.ok).toBe(true);
    if (!reviewTransition.ok) return;
    expect(reviewTransition.dispute.status).toBe('under-review');

    const resolveTransition = await disputeRepository.transitionStatus({
      disputeId,
      allowedCurrentStatuses: ['under-review'],
      nextStatus: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolutionNote: 'Resolved in integration test.',
    });
    expect(resolveTransition.ok).toBe(true);
    if (!resolveTransition.ok) return;
    expect(resolveTransition.dispute.status).toBe('resolved');
    expect(resolveTransition.dispute.resolutionNote).toContain('integration test');
  });
});
