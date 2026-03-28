import { createBookingRequest, createDeclineBookingRequest } from '@quickwerk/api-client';

import type { CreatedBooking } from './booking-state';
import { runtimeConfig } from '../../shared/runtime-config';

const knownBookingStatuses = ['submitted', 'accepted', 'declined'] as const;
type KnownBookingStatus = typeof knownBookingStatuses[number];

function parseBookingStatus(raw: string | undefined): KnownBookingStatus | null {
  if (!raw) return null;
  return (knownBookingStatuses as readonly string[]).includes(raw) ? (raw as KnownBookingStatus) : null;
}

type SubmitBookingInput = {
  sessionToken: string;
  requestedService: string;
};

type SubmitBookingResult =
  | { booking: CreatedBooking; errorMessage?: undefined }
  | { booking?: undefined; errorMessage: string };

export async function submitBookingRequest(
  input: SubmitBookingInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitBookingResult> {
  const request = createBookingRequest(input.sessionToken, {
    requestedService: input.requestedService,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Booking request failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as {
      bookingId?: string;
      requestedService?: string;
      status?: string;
      customerUserId?: string;
    };

    const status = parseBookingStatus(payload.status);

    if (!payload.bookingId || !status) {
      return { errorMessage: 'Booking response missing required fields.' };
    }

    return {
      booking: {
        bookingId: payload.bookingId,
        requestedService: payload.requestedService ?? input.requestedService,
        status,
        customerUserId: payload.customerUserId ?? '',
      },
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown booking failure.',
    };
  }
}

type DeclineBookingInput = {
  sessionToken: string;
  bookingId: string;
  declineReason?: string;
};

type DeclineBookingResult =
  | { booking: CreatedBooking; errorMessage?: undefined }
  | { booking?: undefined; errorMessage: string };

export async function declineBookingRequest(
  input: DeclineBookingInput,
  fetchImpl: typeof fetch = fetch,
): Promise<DeclineBookingResult> {
  const request = createDeclineBookingRequest(input.sessionToken, input.bookingId, {
    declineReason: input.declineReason,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Decline request failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as {
      bookingId?: string;
      requestedService?: string;
      status?: string;
      customerUserId?: string;
      declineReason?: string;
    };

    const declineStatus = parseBookingStatus(payload.status);

    if (!payload.bookingId || !declineStatus) {
      return { errorMessage: 'Decline response missing required fields.' };
    }

    return {
      booking: {
        bookingId: payload.bookingId,
        requestedService: payload.requestedService ?? '',
        status: declineStatus,
        customerUserId: payload.customerUserId ?? '',
        declineReason: payload.declineReason,
      },
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown decline failure.',
    };
  }
}
