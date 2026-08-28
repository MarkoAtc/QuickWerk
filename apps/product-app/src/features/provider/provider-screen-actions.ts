import {
  createAcceptBookingRequest,
  createDeclineBookingRequest,
  createGetMyProviderProfileRequest,
  createListBookingsRequest,
  createRequestUploadUrlRequest,
  createUpsertProviderProfileRequest,
  RequestUploadUrlBody,
  UpsertProviderProfileBody,
} from '@quickwerk/api-client';

import type { ProviderOnboardingState } from './onboarding-state';
import { loadOnboardingStatus } from './onboarding-screen-actions';
import {
  isProviderBookingAccessApproved,
  resolveProviderBookingGateMessage,
} from './provider-onboarding-workspace-state';
import { runtimeConfig } from '../../shared/runtime-config';

export type BookingSummaryItem = {
  bookingId: string;
  status: 'submitted';
  requestedService: string;
  customerLocation?: string;
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
  status: 'accepted';
  requestedService?: string;
  customerUserId?: string;
  providerUserId?: string;
};

type AcceptBookingResult =
  | { booking: AcceptedBooking; errorMessage?: undefined }
  | { booking?: undefined; errorMessage: string };

type BookingTransitionInput = {
  sessionToken: string;
  bookingId: string;
};

type DeclinedBooking = {
  bookingId: string;
  status: 'declined';
  requestedService?: string;
  customerUserId?: string;
};

type DeclineBookingResult =
  | { booking: DeclinedBooking; errorMessage?: undefined }
  | { booking?: undefined; errorMessage: string };

const knownBookingStatuses = ['submitted', 'accepted', 'declined', 'completed'] as const;

function parseBookingSummaryItem(payload: unknown): (Omit<BookingSummaryItem, 'status'> & { status: typeof knownBookingStatuses[number] }) | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const booking = payload as Record<string, unknown>;
  const status = booking['status'];

  if (
    typeof booking['bookingId'] !== 'string'
    || !booking['bookingId'].trim()
    || typeof booking['requestedService'] !== 'string'
    || !booking['requestedService'].trim()
    || typeof booking['createdAt'] !== 'string'
    || !booking['createdAt'].trim()
    || typeof booking['customerUserId'] !== 'string'
    || !booking['customerUserId'].trim()
    || typeof status !== 'string'
    || !(knownBookingStatuses as readonly string[]).includes(status)
  ) {
    return null;
  }

  return {
    bookingId: booking['bookingId'],
    status: status as typeof knownBookingStatuses[number],
    requestedService: booking['requestedService'],
    customerLocation: typeof booking['customerLocation'] === 'string' && booking['customerLocation'].trim()
      ? booking['customerLocation']
      : undefined,
    createdAt: booking['createdAt'],
    customerUserId: booking['customerUserId'],
  };
}

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

    const parsedBookings = payload.map(parseBookingSummaryItem);
    if (parsedBookings.some((booking) => booking === null)) {
      return { errorMessage: 'Booking list response missing required fields.' };
    }

    const bookings = parsedBookings
      .filter((booking): booking is NonNullable<typeof booking> => booking !== null && booking.status === 'submitted')
      .map((booking): BookingSummaryItem => ({ ...booking, status: 'submitted' }));

    return { bookings };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown list bookings failure.',
    };
  }
}

export async function declineProviderBookingRequest(
  input: BookingTransitionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<DeclineBookingResult> {
  const request = createDeclineBookingRequest(input.sessionToken, input.bookingId);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Decline booking failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    if (
      typeof payload['bookingId'] !== 'string'
      || !payload['bookingId'].trim()
      || typeof payload['status'] !== 'string'
    ) {
      return { errorMessage: 'Decline booking response missing required fields.' };
    }

    if (payload['bookingId'] !== input.bookingId) {
      return { errorMessage: 'Decline booking response did not match the requested booking.' };
    }

    if (payload['status'] !== 'declined') {
      return { errorMessage: `Expected status 'declined' but received '${payload['status']}'.` };
    }

    return {
      booking: {
        bookingId: payload['bookingId'],
        status: 'declined',
        requestedService: typeof payload['requestedService'] === 'string' ? payload['requestedService'] : undefined,
        customerUserId: typeof payload['customerUserId'] === 'string' ? payload['customerUserId'] : undefined,
      },
    };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown decline booking failure.',
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

    if (!payload.bookingId?.trim() || !payload.status) {
      return { errorMessage: 'Accept booking response missing required fields.' };
    }

    if (payload.bookingId !== input.bookingId) {
      return { errorMessage: 'Accept booking response did not match the requested booking.' };
    }

    if (payload.status !== 'accepted') {
      return { errorMessage: `Expected status 'accepted' but received '${payload.status}'.` };
    }

    return {
      booking: {
        bookingId: payload.bookingId,
        status: 'accepted',
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
  photoUrl?: string;
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
    photoUrl: typeof payload['photoUrl'] === 'string' ? payload['photoUrl'] : undefined,
    isPublic: Boolean(payload['isPublic']),
    createdAt,
    updatedAt,
  };
}

type ProviderDashboardContext = {
  onboardingState: ProviderOnboardingState;
  profile: ProviderProfilePayload | null;
  profileWarning?: string;
};

export type ProviderDashboardLoadResult =
  | (ProviderDashboardContext & { status: 'loaded'; bookings: BookingSummaryItem[] })
  | (ProviderDashboardContext & { status: 'blocked'; bookings: []; accessMessage: string })
  | { status: 'error'; message: string; profile: ProviderProfilePayload | null; profileWarning?: string };

export async function loadProviderDashboardData(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderDashboardLoadResult> {
  const [onboardingState, profileResult] = await Promise.all([
    loadOnboardingStatus(sessionToken, fetchImpl),
    loadMyProviderProfile(sessionToken, fetchImpl),
  ]);

  let profile: ProviderProfilePayload | null = null;
  let profileWarning: string | undefined;
  if (profileResult.profile === undefined) {
    profileWarning = profileResult.errorMessage;
  } else {
    profile = profileResult.profile;
  }

  if (onboardingState.status === 'error') {
    return { status: 'error', message: onboardingState.errorMessage, profile, profileWarning };
  }

  if (!isProviderBookingAccessApproved(onboardingState)) {
    return {
      status: 'blocked',
      bookings: [],
      onboardingState,
      profile,
      profileWarning,
      accessMessage: resolveProviderBookingGateMessage(onboardingState) ?? 'Booking access is currently unavailable.',
    };
  }

  const bookingsResult = await listBookingsRequest(sessionToken, fetchImpl);
  if (bookingsResult.bookings === undefined) {
    return { status: 'error', message: bookingsResult.errorMessage, profile, profileWarning };
  }

  return {
    status: 'loaded',
    bookings: bookingsResult.bookings,
    onboardingState,
    profile,
    profileWarning,
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

export type UploadUrlPayload = {
  uploadId: string;
  presignedUrl: string;
  expiresAt: string;
  filename: string;
  mimeType: string;
};

export type RequestUploadUrlResult =
  | { uploadUrl: UploadUrlPayload; errorMessage?: undefined }
  | { uploadUrl?: undefined; errorMessage: string };

export async function requestVerificationUploadUrl(
  sessionToken: string,
  body: RequestUploadUrlBody,
  fetchImpl: typeof fetch = fetch,
): Promise<RequestUploadUrlResult> {
  const request = createRequestUploadUrlRequest(sessionToken, body);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Request upload URL failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as Record<string, unknown>;

    const uploadId = typeof payload['uploadId'] === 'string' ? payload['uploadId'] : '';
    const presignedUrl = typeof payload['presignedUrl'] === 'string' ? payload['presignedUrl'] : '';
    const expiresAt = typeof payload['expiresAt'] === 'string' ? payload['expiresAt'] : '';
    const filename = typeof payload['filename'] === 'string' ? payload['filename'] : '';
    const mimeType = typeof payload['mimeType'] === 'string' ? payload['mimeType'] : '';

    if (!uploadId || !presignedUrl || !expiresAt) {
      return { errorMessage: 'Upload URL response missing required fields.' };
    }

    return { uploadUrl: { uploadId, presignedUrl, expiresAt, filename, mimeType } };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown upload URL failure.',
    };
  }
}
