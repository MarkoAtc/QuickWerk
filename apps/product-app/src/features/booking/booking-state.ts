export type CreatedBooking = {
  bookingId: string;
  requestedService: string;
  status: string;
  customerUserId: string;
};

export type BookingFormState = {
  requestedService: string;
  isSubmitting: boolean;
  errorMessage?: string;
};

export const initialBookingFormState: BookingFormState = {
  requestedService: '',
  isSubmitting: false,
};

export type BookingScreenState =
  | { status: 'idle'; form: BookingFormState }
  | { status: 'submitting'; form: BookingFormState }
  | { status: 'error'; form: BookingFormState; errorMessage: string }
  | { status: 'submitted'; booking: CreatedBooking };

export const createIdleBookingScreenState = (form: BookingFormState = initialBookingFormState): BookingScreenState => ({
  status: 'idle',
  form,
});

export const createSubmittingBookingScreenState = (form: BookingFormState): BookingScreenState => ({
  status: 'submitting',
  form,
});

export const createErrorBookingScreenState = (form: BookingFormState, errorMessage: string): BookingScreenState => ({
  status: 'error',
  form,
  errorMessage,
});

export const createSubmittedBookingScreenState = (booking: CreatedBooking): BookingScreenState => ({
  status: 'submitted',
  booking,
});
