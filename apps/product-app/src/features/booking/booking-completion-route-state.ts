import { loadBookingCompletion } from './booking-completion-screen-actions';
import { presentBookingCompletion, type BookingCompletionViewModel } from './booking-completion-presenter';

export type BookingCompletionRouteState =
  | { status: 'loading' }
  | { status: 'error'; errorMessage: string }
  | { status: 'empty'; message: string; bookingStatus: string }
  | { status: 'loaded'; viewModel: BookingCompletionViewModel };

type ResolveBookingCompletionRouteStateInput = {
  sessionToken: string;
  bookingId: string | null;
  loadBookingCompletionImpl?: typeof loadBookingCompletion;
  presentBookingCompletionImpl?: typeof presentBookingCompletion;
};

export function resolveCompletionBookingIdParam(rawBookingId: string | string[] | undefined): string | null {
  const candidate = Array.isArray(rawBookingId) ? rawBookingId[0] : rawBookingId;

  if (typeof candidate !== 'string' || !candidate.trim()) {
    return null;
  }

  return candidate.trim();
}

export async function resolveBookingCompletionRouteState(
  input: ResolveBookingCompletionRouteStateInput,
): Promise<BookingCompletionRouteState> {
  if (!input.bookingId) {
    return { status: 'error', errorMessage: 'Missing booking id in route params.' };
  }

  const loadImpl = input.loadBookingCompletionImpl ?? loadBookingCompletion;
  const presentImpl = input.presentBookingCompletionImpl ?? presentBookingCompletion;

  const result = await loadImpl({ sessionToken: input.sessionToken, bookingId: input.bookingId });

  if (result.errorMessage) {
    return { status: 'error', errorMessage: result.errorMessage };
  }

  if (!result.booking) {
    return { status: 'error', errorMessage: 'Booking details are unavailable.' };
  }

  if (result.booking.status !== 'completed') {
    return {
      status: 'empty',
      message: 'Completion details will appear once the booking is marked completed.',
      bookingStatus: result.booking.status,
    };
  }

  return {
    status: 'loaded',
    viewModel: presentImpl({
      booking: result.booking,
      payment: result.payment,
      invoice: result.invoice,
      reviews: result.reviews,
      latestDispute: result.latestDispute,
      warningMessages: result.warningMessages,
    }),
  };
}
