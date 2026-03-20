export type BookingListItem = {
  bookingId: string;
  requestedService: string;
  status: string;
  customerUserId: string;
};

export type AcceptBookingState =
  | { status: 'idle'; bookingId: string }
  | { status: 'accepting'; bookingId: string }
  | { status: 'accepted'; bookingId: string; updatedStatus: string }
  | { status: 'error'; bookingId: string; errorMessage: string };

export type ProviderScreenState =
  | { status: 'idle'; bookingId: string; acceptState: AcceptBookingState }
  | { status: 'error'; errorMessage: string };

export const createIdleProviderScreenState = (bookingId: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'idle', bookingId },
});

export const createAcceptingProviderScreenState = (bookingId: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepting', bookingId },
});

export const createAcceptedProviderScreenState = (bookingId: string, updatedStatus: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'accepted', bookingId, updatedStatus },
});

export const createErrorProviderScreenState = (bookingId: string, errorMessage: string): ProviderScreenState => ({
  status: 'idle',
  bookingId,
  acceptState: { status: 'error', bookingId, errorMessage },
});
