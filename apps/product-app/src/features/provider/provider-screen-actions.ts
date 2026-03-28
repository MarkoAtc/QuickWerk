import {
  createAcceptBookingRequest,
  createGetMyProviderProfileRequest,
  createListBookingsRequest,
  createUpsertProviderProfileRequest,
  UpsertProviderProfileBody,
} from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export type BookingSummaryItem = {
  bookingId: string;
  status: string;
  requestedService: string;
  createdAt: string;
  customerUserId: string;
};

export type ListBookingsResult =
  | { bookings: BookingSummaryItem[]; errorMessage?: undefined }
  | { bookings?: undefined; errorMessage: string };

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

export async function listBookingsRequest(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListBookingsResult> {
  const request = createListBookingsRequest(sessionToken);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { errorMessage: `List bookings failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      return { errorMessage: 'List bookings response was not an array.' };
    }

    const bookings: BookingSummaryItem[] = payload.map((item: unknown) => {
      const b = item as Record<string, unknown>;
      return {
        bookingId: typeof b['bookingId'] === 'string' ? b['bookingId'] : '',
        status: typeof b['status'] === 'string' ? b['status'] : '',
        requestedService: typeof b['requestedService'] === 'string' ? b['requestedService'] : '',
        createdAt: typeof b['createdAt'] === 'string' ? b['createdAt'] : '',
        customerUserId: typeof b['customerUserId'] === 'string' ? b['customerUserId'] : '',
      };
    });

    return { bookings };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown list bookings failure.',
    };
  }
}

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

// --- Provider Profile ---

export type ProviderProfilePayload = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories: string[];
  serviceArea?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoadProfileResult =
  | { profile: ProviderProfilePayload; errorMessage?: undefined }
  | { profile: null; errorMessage?: undefined }
  | { profile?: undefined; errorMessage: string };

export type SaveProfileResult =
  | { profile: ProviderProfilePayload; errorMessage?: undefined }
  | { profile?: undefined; errorMessage: string };

/**
 * Parses a raw provider profile payload from the API.
 * Returns null if required fields are missing or invalid.
 */
function parseProviderProfilePayload(payload: Record<string, unknown>): ProviderProfilePayload | null {
  const providerUserId = typeof payload['providerUserId'] === 'string' ? payload['providerUserId'] : '';
  const displayName = typeof payload['displayName'] === 'string' ? payload['displayName'] : '';
  const createdAt = typeof payload['createdAt'] === 'string' ? payload['createdAt'] : '';
  const updatedAt = typeof payload['updatedAt'] === 'string' ? payload['updatedAt'] : '';

  if (!providerUserId || !displayName || !createdAt || !updatedAt) {
    return null;
  }

  return {
    providerUserId,
    displayName,
    bio: typeof payload['bio'] === 'string' ? payload['bio'] : undefined,
    tradeCategories: Array.isArray(payload['tradeCategories'])
      ? (payload['tradeCategories'] as string[])
      : [],
    serviceArea: typeof payload['serviceArea'] === 'string' ? payload['serviceArea'] : undefined,
    isPublic: Boolean(payload['isPublic']),
    createdAt,
    updatedAt,
  };
}

export async function loadMyProviderProfile(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadProfileResult> {
  const request = createGetMyProviderProfileRequest(sessionToken);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (response.status === 404 || response.status === 204) {
      return { profile: null };
    }

    if (!response.ok) {
      return { errorMessage: `Load profile failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as Record<string, unknown>;

    // API returns { status: 'not-set' } when no profile exists
    if (payload['status'] === 'not-set') {
      return { profile: null };
    }

    const profile = parseProviderProfilePayload(payload);

    if (!profile) {
      return { errorMessage: 'Profile response missing required fields.' };
    }

    return { profile };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown load profile failure.',
    };
  }
}

export async function saveMyProviderProfile(
  sessionToken: string,
  body: UpsertProviderProfileBody,
  fetchImpl: typeof fetch = fetch,
): Promise<SaveProfileResult> {
  const request = createUpsertProviderProfileRequest(sessionToken, body);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Save profile failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as Record<string, unknown>;

    const profile = parseProviderProfilePayload(payload);

    if (!profile) {
      return { errorMessage: 'Save profile response missing required fields.' };
    }

    return { profile };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown save profile failure.',
    };
  }
}
