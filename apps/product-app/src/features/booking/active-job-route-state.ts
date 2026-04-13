import { presentActiveJob, type ActiveJobViewModel } from './active-job-presenter';
import { loadBookingContinuation } from './active-job-screen-actions';

export type ActiveJobRouteState =
  | { status: 'loading' }
  | { status: 'error'; errorMessage: string }
  | { status: 'loaded'; viewModel: ActiveJobViewModel };

type ViewerRole = 'customer' | 'provider';

type ResolveActiveJobRouteStateInput = {
  sessionToken: string;
  bookingId: string | null;
  viewerRole: ViewerRole;
  loadBookingContinuationImpl?: typeof loadBookingContinuation;
  presentActiveJobImpl?: typeof presentActiveJob;
};

export function resolveBookingIdParam(rawBookingId: string | string[] | undefined): string | null {
  const candidate = Array.isArray(rawBookingId) ? rawBookingId[0] : rawBookingId;

  if (typeof candidate !== 'string' || !candidate.trim()) {
    return null;
  }

  return candidate.trim();
}

export async function resolveActiveJobRouteState(
  input: ResolveActiveJobRouteStateInput,
): Promise<ActiveJobRouteState> {
  if (!input.bookingId) {
    return { status: 'error', errorMessage: 'Missing booking id in route params.' };
  }

  const loadImpl = input.loadBookingContinuationImpl ?? loadBookingContinuation;
  const presentImpl = input.presentActiveJobImpl ?? presentActiveJob;

  const result = await loadImpl({ sessionToken: input.sessionToken, bookingId: input.bookingId });

  if (result.errorMessage) {
    return { status: 'error', errorMessage: result.errorMessage };
  }

  if (!result.booking) {
    return { status: 'error', errorMessage: 'Booking details are unavailable.' };
  }

  return {
    status: 'loaded',
    viewModel: presentImpl({
      viewerRole: input.viewerRole,
      booking: result.booking,
      payment: result.payment,
      warningMessage: result.warningMessage,
    }),
  };
}
