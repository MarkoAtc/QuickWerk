import { presentActiveJob, type ActiveJobViewModel } from './active-job-presenter';
import { loadBookingContinuation, loadProviderIdentity, loadTracking } from './active-job-screen-actions';

export type ActiveJobRouteState =
  | { status: 'loading' }
  | { status: 'error'; errorMessage: string }
  | { status: 'handoff'; bookingId: string }
  | { status: 'loaded'; viewModel: ActiveJobViewModel };

type ViewerRole = 'customer' | 'provider';

type ResolveActiveJobRouteStateInput = {
  sessionToken: string;
  bookingId: string | null;
  viewerRole: ViewerRole;
  loadBookingContinuationImpl?: typeof loadBookingContinuation;
  loadProviderIdentityImpl?: typeof loadProviderIdentity;
  loadTrackingImpl?: typeof loadTracking;
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
  const loadProviderIdentityImpl = input.loadProviderIdentityImpl ?? loadProviderIdentity;
  const loadTrackingImpl = input.loadTrackingImpl ?? loadTracking;
  const presentImpl = input.presentActiveJobImpl ?? presentActiveJob;

  const result = await loadImpl({ sessionToken: input.sessionToken, bookingId: input.bookingId });

  if (result.errorMessage) {
    return { status: 'error', errorMessage: result.errorMessage };
  }

  if (!result.booking) {
    return { status: 'error', errorMessage: 'Booking details are unavailable.' };
  }

  if (result.booking.status === 'completed') {
    return { status: 'handoff', bookingId: result.booking.bookingId };
  }

  const providerIdentity = input.viewerRole === 'customer' && result.booking.providerUserId
    ? await loadProviderIdentityImpl({
      sessionToken: input.sessionToken,
      bookingId: input.bookingId,
      providerUserId: result.booking.providerUserId,
    })
    : null;

  const tracking = input.viewerRole === 'customer' && result.booking.status === 'accepted'
    ? await loadTrackingImpl({ sessionToken: input.sessionToken, bookingId: input.bookingId })
    : null;

  return {
    status: 'loaded',
    viewModel: presentImpl({
      viewerRole: input.viewerRole,
      booking: result.booking,
      payment: result.payment,
      warningMessage: result.warningMessage,
      providerIdentity,
      tracking,
    }),
  };
}
