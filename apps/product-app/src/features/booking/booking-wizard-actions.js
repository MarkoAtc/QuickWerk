import { runtimeConfig } from '../../shared/runtime-config';

export async function submitBooking({ issueType, urgency, address, category }, token, sessionApiBase) {
  const baseUrl = sessionApiBase ?? runtimeConfig.platformApiBaseUrl;
  const requestedService = [category, issueType, urgency].filter(Boolean).join(' / ');

  try {
    const response = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestedService }),
    });

    if (!response.ok) {
      return { ok: false, error: `Booking request failed with HTTP ${response.status}.` };
    }

    const payload = await response.json();

    if (!payload.bookingId || !payload.status) {
      return { ok: false, error: 'Booking response missing required fields.' };
    }

    return { ok: true, bookingId: payload.bookingId, status: payload.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown booking failure.' };
  }
}
