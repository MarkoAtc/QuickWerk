import {
  createGetBookingContactRequest,
  createGetBookingPaymentRequest,
  createGetBookingProviderIdentityRequest,
  createGetBookingRequest,
  createGetProviderReviewsRequest,
} from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export type BookingContinuationStatus = 'submitted' | 'accepted' | 'declined' | 'completed';

export type BookingStatusHistoryEvent = {
  changedAt: string;
  from: BookingContinuationStatus | null;
  to: BookingContinuationStatus;
  actorRole: 'customer' | 'provider';
  actorUserId: string;
};

export type BookingContinuationRecord = {
  bookingId: string;
  createdAt: string;
  customerUserId: string;
  providerUserId?: string;
  requestedService: string;
  status: BookingContinuationStatus;
  declineReason?: string;
  statusHistory: BookingStatusHistoryEvent[];
};

export type BookingContinuationPayment = {
  paymentId: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  status: string;
};

export type LoadBookingContinuationResult =
  | { booking: BookingContinuationRecord; payment?: BookingContinuationPayment; warningMessage?: string; errorMessage?: undefined }
  | { booking?: undefined; payment?: undefined; warningMessage?: undefined; errorMessage: string };

type LoadBookingContinuationInput = {
  sessionToken: string;
  bookingId: string;
};

const knownStatuses = ['submitted', 'accepted', 'declined', 'completed'] as const;

function parseStatus(raw: unknown): BookingContinuationStatus | null {
  if (typeof raw !== 'string') {
    return null;
  }

  return (knownStatuses as readonly string[]).includes(raw) ? (raw as BookingContinuationStatus) : null;
}

function parseStatusHistory(raw: unknown): BookingStatusHistoryEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const event = item as Record<string, unknown>;
      const to = parseStatus(event['to']);
      const fromRaw = event['from'];
      const from = fromRaw == null ? null : parseStatus(fromRaw);

      if (
        !to
        || (fromRaw != null && !from)
        || typeof event['changedAt'] !== 'string'
        || (event['actorRole'] !== 'customer' && event['actorRole'] !== 'provider')
        || typeof event['actorUserId'] !== 'string'
      ) {
        return null;
      }

      return {
        changedAt: event['changedAt'],
        from,
        to,
        actorRole: event['actorRole'],
        actorUserId: event['actorUserId'],
      };
    })
    .filter((event): event is BookingStatusHistoryEvent => event != null);
}

function parseBooking(payload: unknown): BookingContinuationRecord | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const booking = payload as Record<string, unknown>;
  const status = parseStatus(booking['status']);

  if (
    typeof booking['bookingId'] !== 'string'
    || typeof booking['createdAt'] !== 'string'
    || typeof booking['customerUserId'] !== 'string'
    || typeof booking['requestedService'] !== 'string'
    || !status
  ) {
    return null;
  }

  return {
    bookingId: booking['bookingId'],
    createdAt: booking['createdAt'],
    customerUserId: booking['customerUserId'],
    providerUserId: typeof booking['providerUserId'] === 'string' ? booking['providerUserId'] : undefined,
    requestedService: booking['requestedService'],
    status,
    declineReason: typeof booking['declineReason'] === 'string' ? booking['declineReason'] : undefined,
    statusHistory: parseStatusHistory(booking['statusHistory']),
  };
}

function parsePayment(payload: unknown): BookingContinuationPayment | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const payment = payload as Record<string, unknown>;

  if (
    typeof payment['paymentId'] !== 'string'
    || typeof payment['bookingId'] !== 'string'
    || typeof payment['currency'] !== 'string'
    || typeof payment['status'] !== 'string'
  ) {
    return null;
  }

  const amountCents = payment['amountCents'];
  if (
    typeof amountCents !== 'number'
    || !Number.isFinite(amountCents)
    || !Number.isInteger(amountCents)
    || amountCents < 0
  ) {
    return null;
  }

  return {
    paymentId: payment['paymentId'],
    bookingId: payment['bookingId'],
    amountCents: amountCents,
    currency: payment['currency'],
    status: payment['status'],
  };
}

export async function loadBookingContinuation(
  input: LoadBookingContinuationInput,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadBookingContinuationResult> {
  const bookingRequest = createGetBookingRequest(input.sessionToken, input.bookingId);

  try {
    const bookingResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${bookingRequest.path}`, {
      method: bookingRequest.method,
      headers: bookingRequest.headers,
    });

    if (!bookingResponse.ok) {
      return { errorMessage: `Failed to load booking with HTTP ${bookingResponse.status}.` };
    }

    const booking = parseBooking(await bookingResponse.json());

    if (!booking) {
      return { errorMessage: 'Booking details response missing required fields.' };
    }

    try {
      const paymentRequest = createGetBookingPaymentRequest(input.sessionToken, input.bookingId);
      const paymentResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${paymentRequest.path}`, {
        method: paymentRequest.method,
        headers: paymentRequest.headers,
      });

      if (!paymentResponse.ok) {
        if (paymentResponse.status === 403 || paymentResponse.status === 404) {
          return { booking };
        }

        return {
          booking,
          warningMessage: `Payment details unavailable (HTTP ${paymentResponse.status}).`,
        };
      }

      const payment = parsePayment(await paymentResponse.json());

      if (!payment) {
        return {
          booking,
          warningMessage: 'Payment details response missing required fields.',
        };
      }

      return { booking, payment };
    } catch (paymentError) {
      return {
        booking,
        warningMessage: `Payment details unavailable: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}.`,
      };
    }
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown booking continuation failure.',
    };
  }
}

export type ProviderIdentitySummary = {
  displayName: string;
  photoUrl?: string;
  averageRating?: number;
  reviewCount: number;
  vehicleDescription?: string;
  licensePlate?: string;
  phone?: string;
};

function parseBookingProviderIdentity(payload: unknown): Pick<ProviderIdentitySummary, 'displayName' | 'photoUrl' | 'vehicleDescription' | 'licensePlate'> | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const profile = payload as Record<string, unknown>;

  if (typeof profile['displayName'] !== 'string') {
    return null;
  }

  return {
    displayName: profile['displayName'],
    photoUrl: typeof profile['photoUrl'] === 'string' ? profile['photoUrl'] : undefined,
    vehicleDescription: typeof profile['vehicleDescription'] === 'string' ? profile['vehicleDescription'] : undefined,
    licensePlate: typeof profile['licensePlate'] === 'string' ? profile['licensePlate'] : undefined,
  };
}

function parseReviewRatings(payload: unknown): number[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => (item !== null && typeof item === 'object' ? (item as Record<string, unknown>)['rating'] : null))
    .filter((rating): rating is number => typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5);
}

type LoadProviderIdentityInput = {
  sessionToken: string;
  bookingId: string;
  providerUserId: string;
};

/**
 * Best-effort fetch: the provider identity card is a graceful enhancement, not a
 * required part of the screen, so any failure (network, not-yet-accepted booking,
 * malformed response) resolves to null rather than surfacing an error.
 *
 * Name/photo/vehicle/plate come from the booking-scoped endpoint (server-authorized
 * per booking, not public discovery — see bookings.service.ts getBookingProviderIdentity).
 * Rating is a separate, already-public lookup by providerUserId.
 */
export async function loadProviderIdentity(
  input: LoadProviderIdentityInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderIdentitySummary | null> {
  try {
    const identityRequest = createGetBookingProviderIdentityRequest(input.sessionToken, input.bookingId);
    const identityResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${identityRequest.path}`, {
      method: identityRequest.method,
      headers: identityRequest.headers,
    });

    if (!identityResponse.ok) {
      return null;
    }

    const identity = parseBookingProviderIdentity(await identityResponse.json());
    if (!identity) {
      return null;
    }

    let ratings: number[] = [];
    try {
      const reviewsRequest = createGetProviderReviewsRequest(input.providerUserId);
      const reviewsResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${reviewsRequest.path}`, {
        method: reviewsRequest.method,
      });

      if (reviewsResponse.ok) {
        ratings = parseReviewRatings(await reviewsResponse.json());
      }
    } catch {
      // Rating is a further enhancement on top of the identity fetch — omit it, don't fail the whole card.
    }

    let phone: string | undefined;
    try {
      const contactRequest = createGetBookingContactRequest(input.sessionToken, input.bookingId);
      const contactResponse = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${contactRequest.path}`, {
        method: contactRequest.method,
        headers: contactRequest.headers,
      });

      if (contactResponse.ok) {
        const contactPayload = await contactResponse.json();
        const rawPhone = contactPayload !== null && typeof contactPayload === 'object'
          ? (contactPayload as Record<string, unknown>)['phone']
          : null;
        phone = typeof rawPhone === 'string' && rawPhone.trim() ? rawPhone : undefined;
      }
    } catch {
      // Contact is a further enhancement on top of the identity fetch — omit it, don't fail the whole card.
    }

    return {
      displayName: identity.displayName,
      photoUrl: identity.photoUrl,
      vehicleDescription: identity.vehicleDescription,
      licensePlate: identity.licensePlate,
      averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : undefined,
      reviewCount: ratings.length,
      phone,
    };
  } catch {
    return null;
  }
}