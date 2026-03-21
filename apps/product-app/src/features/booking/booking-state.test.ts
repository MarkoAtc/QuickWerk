import { describe, expect, it } from 'vitest';

import {
  createErrorBookingScreenState,
  createIdleBookingScreenState,
  createSubmittedBookingScreenState,
  createSubmittingBookingScreenState,
  initialBookingFormState,
} from './booking-state';

describe('booking screen state helpers', () => {
  it('returns idle state with default form when no argument given', () => {
    const state = createIdleBookingScreenState();
    expect(state).toMatchObject({ status: 'idle', form: initialBookingFormState });
  });

  it('returns submitting state with the given form', () => {
    const form = { requestedService: 'Fix the boiler', isSubmitting: true };
    const state = createSubmittingBookingScreenState(form);
    expect(state).toMatchObject({ status: 'submitting', form });
  });

  it('returns error state with error message attached', () => {
    const form = { requestedService: 'Fix the boiler', isSubmitting: false };
    const state = createErrorBookingScreenState(form, 'Booking request failed with HTTP 401.');
    expect(state).toMatchObject({ status: 'error', form, errorMessage: 'Booking request failed with HTTP 401.' });
  });

  it('returns submitted state with created booking details', () => {
    const booking = {
      bookingId: 'bk-001',
      requestedService: 'Fix the boiler',
      status: 'submitted',
      customerUserId: 'usr-001',
    };
    const state = createSubmittedBookingScreenState(booking);
    expect(state).toMatchObject({ status: 'submitted', booking });
  });
});
