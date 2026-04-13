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
});
