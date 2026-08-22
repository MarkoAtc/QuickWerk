import { describe, expect, it } from 'vitest';

import { presentActiveJob } from './active-job-presenter';
import type { BookingContinuationRecord } from './active-job-screen-actions';

const createBooking = (status: BookingContinuationRecord['status']): BookingContinuationRecord => ({
  bookingId: 'bk-1',
  createdAt: '2026-04-13T20:00:00.000Z',
  customerUserId: 'cust-1',
  providerUserId: status === 'submitted' ? undefined : 'prov-1',
  requestedService: 'Fix sink',
  status,
  statusHistory: [
    {
      changedAt: '2026-04-13T20:01:00.000Z',
      from: null,
      to: 'submitted',
      actorRole: 'customer',
      actorUserId: 'cust-1',
    },
  ],
});

describe('presentActiveJob', () => {
  it('builds submitted view model with provider pending', () => {
    const model = presentActiveJob({
      viewerRole: 'customer',
      booking: createBooking('submitted'),
    });

    expect(model.headline).toBe('Booking submitted');
    expect(model.counterpartValue).toBe('Not assigned yet');
    expect(model.timeline).toEqual([
      { id: 'submitted', label: 'Submitted', state: 'active' },
      { id: 'accepted', label: 'Accepted', state: 'pending' },
      { id: 'completed', label: 'Completed', state: 'pending' },
    ]);
  });

  it('builds accepted view model with payment summary', () => {
    const model = presentActiveJob({
      viewerRole: 'customer',
      booking: createBooking('accepted'),
      payment: {
        paymentId: 'pay-1',
        bookingId: 'bk-1',
        amountCents: 12345,
        currency: 'EUR',
        status: 'captured',
      },
    });

    expect(model.headline).toBe('Provider assigned');
    expect(model.paymentSummary).toContain('EUR 123.45');
    expect(model.timeline[0]?.state).toBe('done');
    expect(model.timeline[1]?.state).toBe('active');
    // Already paid -- no "Pay now" CTA even though the booking is accepted.
    expect(model.showPayNowCta).toBe(false);
  });

  it('builds declined timeline variant', () => {
    const model = presentActiveJob({
      viewerRole: 'provider',
      booking: {
        ...createBooking('declined'),
        declineReason: 'Out of coverage area',
      },
    });

    expect(model.headline).toBe('Booking declined');
    expect(model.subheadline).toContain('Out of coverage area');
    expect(model.timeline).toEqual([
      { id: 'submitted', label: 'Submitted', state: 'done' },
      { id: 'declined', label: 'Declined', state: 'active' },
    ]);
    expect(model.counterpartLabel).toBe('Customer');
    expect(model.counterpartValue).toBe('cust-1');
  });

  it('surfaces providerIdentity for the customer viewer', () => {
    const model = presentActiveJob({
      viewerRole: 'customer',
      booking: createBooking('accepted'),
      providerIdentity: {
        displayName: 'Marcus Hoffman',
        averageRating: 4.9,
        reviewCount: 12,
        vehicleDescription: 'White VW Transporter',
        licensePlate: 'B-HW-2024',
      },
    });

    expect(model.providerIdentity).toEqual({
      displayName: 'Marcus Hoffman',
      averageRating: 4.9,
      reviewCount: 12,
      vehicleDescription: 'White VW Transporter',
      licensePlate: 'B-HW-2024',
    });
  });

  it('omits providerIdentity for the provider viewer even when supplied', () => {
    const model = presentActiveJob({
      viewerRole: 'provider',
      booking: { ...createBooking('accepted'), customerUserId: 'cust-1' },
      providerIdentity: { displayName: 'Marcus Hoffman', reviewCount: 0 },
    });

    expect(model.providerIdentity).toBeUndefined();
  });

  it('surfaces tracking for the customer viewer', () => {
    const model = presentActiveJob({
      viewerRole: 'customer',
      booking: createBooking('accepted'),
      tracking: { source: 'simulated', status: 'en-route', etaSeconds: 300, distanceKm: 1.2 },
    });

    expect(model.tracking).toEqual({ source: 'simulated', status: 'en-route', etaSeconds: 300, distanceKm: 1.2 });
  });

  it('omits tracking for the provider viewer even when supplied', () => {
    const model = presentActiveJob({
      viewerRole: 'provider',
      booking: { ...createBooking('accepted'), customerUserId: 'cust-1' },
      tracking: { source: 'simulated', status: 'en-route', etaSeconds: 300, distanceKm: 1.2 },
    });

    expect(model.tracking).toBeUndefined();
  });
});

describe('presentActiveJob showPayNowCta', () => {
  it('is true for a customer viewing their own accepted, unpaid booking', () => {
    const model = presentActiveJob({ viewerRole: 'customer', booking: createBooking('accepted') });
    expect(model.showPayNowCta).toBe(true);
  });

  it('is false for the provider viewer, even on an accepted, unpaid booking', () => {
    const model = presentActiveJob({
      viewerRole: 'provider',
      booking: { ...createBooking('accepted'), customerUserId: 'cust-1' },
    });
    expect(model.showPayNowCta).toBe(false);
  });

  it('is false for a submitted booking (not yet accepted)', () => {
    const model = presentActiveJob({ viewerRole: 'customer', booking: createBooking('submitted') });
    expect(model.showPayNowCta).toBe(false);
  });

  it('is false for a completed booking', () => {
    const model = presentActiveJob({ viewerRole: 'customer', booking: createBooking('completed') });
    expect(model.showPayNowCta).toBe(false);
  });

  it('is false for an accepted booking that already has a captured payment', () => {
    const model = presentActiveJob({
      viewerRole: 'customer',
      booking: createBooking('accepted'),
      payment: { paymentId: 'pay-1', bookingId: 'bk-1', amountCents: 22750, currency: 'EUR', status: 'captured' },
    });
    expect(model.showPayNowCta).toBe(false);
  });
});
