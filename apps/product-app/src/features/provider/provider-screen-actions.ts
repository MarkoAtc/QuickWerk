import { createAcceptBookingRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

type AcceptBookingInput = {
  sessionToken: string;
  bookingId: string;
};

type AcceptedBooking = {
  bookingId: string;
  status: string;
  requestedService?: string;
  customerUserId?: string;
  providerUserId?: string;
};

type AcceptBookingResult =
  | { booking: AcceptedBooking; errorMessage?: undefined }
  | { booking?: undefined; errorMessage: string };

export async function acceptBookingRequest(
  input: AcceptBookingInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AcceptBookingResult> {
  const request = createAcceptBookingRequest(input.sessionToken, input.bookingId);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { errorMessage: `Accept booking failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as {
      bookingId?: string;
      status?: string;
      requestedService?: string;
      customerUserId?: string;
      providerUserId?: string;
      ok?: boolean;
      error?: string;
    };

    if (payload.ok === false) {
      return { errorMessage: payload.error ?? 'Booking accept was rejected by server.' };
    }

    if (!payload.bookingId || !payload.status) {
      return { errorMessage: 'Accept booking response missing required fields.' };
    }

    return {
      booking: {
        bookingId: payload.bookingId,
        status: payload.status,
        requestedService: payload.requestedService,
        customerUserId: payload.customerUserId,
        providerUserId: payload.providerUserId,
      },
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown accept booking failure.',
    };
  }
}
