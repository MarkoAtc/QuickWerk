import { createGetBookingPaymentRequest, createGetBookingRequest } from '@quickwerk/api-client';

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
  const payment = payload as Record<string, unknown>;

  if (
    typeof payment['paymentId'] !== 'string'
    || typeof payment['bookingId'] !== 'string'
    || typeof payment['amountCents'] !== 'number'
    || typeof payment['currency'] !== 'string'
    || typeof payment['status'] !== 'string'
  ) {
    return null;
  }

  return {
    paymentId: payment['paymentId'],
    bookingId: payment['bookingId'],
    amountCents: payment['amountCents'],
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
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown booking continuation failure.',
    };
  }
}
