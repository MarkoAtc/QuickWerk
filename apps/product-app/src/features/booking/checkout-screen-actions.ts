import {
  createAddPaymentMethodRequest,
  createCheckoutBookingRequest,
  createListMyPaymentMethodsRequest,
  createRequestBookingQuoteRequest,
} from '@quickwerk/api-client';

import { loadBookingContinuation } from './active-job-screen-actions';
import { runtimeConfig } from '../../shared/runtime-config';

export type QuoteLineItem = {
  label: string;
  amountCents: number;
};

export type Quote = {
  quoteId: string;
  bookingId: string;
  lineItems: QuoteLineItem[];
  calloutFeeCents: number;
  laborCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  pricingTableVersion: string;
  createdAt: string;
  expiresAt: string;
};

export type PaymentMethod = {
  paymentMethodId: string;
  label: string;
  last4: string;
  brand: string;
  createdAt: string;
};

function parseQuote(payload: unknown): Quote | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const quote = payload as Record<string, unknown>;

  if (
    typeof quote['quoteId'] !== 'string'
    || typeof quote['bookingId'] !== 'string'
    || !Array.isArray(quote['lineItems'])
    || typeof quote['calloutFeeCents'] !== 'number'
    || typeof quote['laborCents'] !== 'number'
    || typeof quote['platformFeeCents'] !== 'number'
    || typeof quote['totalCents'] !== 'number'
    || typeof quote['currency'] !== 'string'
    || typeof quote['pricingTableVersion'] !== 'string'
    || typeof quote['createdAt'] !== 'string'
    || typeof quote['expiresAt'] !== 'string'
  ) {
    return null;
  }

  // Validate all line items first -- if any are malformed, reject the entire quote.
  const lineItems: QuoteLineItem[] = [];

  for (const item of quote['lineItems']) {
    if (item === null || typeof item !== 'object') {
      return null;
    }

    const line = item as Record<string, unknown>;

    if (typeof line['label'] !== 'string' || typeof line['amountCents'] !== 'number') {
      return null;
    }

    lineItems.push({ label: line['label'], amountCents: line['amountCents'] });
  }

  if (lineItems.length === 0) {
    return null;
  }

  return {
    quoteId: quote['quoteId'],
    bookingId: quote['bookingId'],
    lineItems,
    calloutFeeCents: quote['calloutFeeCents'],
    laborCents: quote['laborCents'],
    platformFeeCents: quote['platformFeeCents'],
    totalCents: quote['totalCents'],
    currency: quote['currency'],
    pricingTableVersion: quote['pricingTableVersion'],
    createdAt: quote['createdAt'],
    expiresAt: quote['expiresAt'],
  };
}

function parsePaymentMethod(payload: unknown): PaymentMethod | null {
  if (payload === null || typeof payload !== 'object') {
    return null;
  }

  const method = payload as Record<string, unknown>;

  if (
    typeof method['paymentMethodId'] !== 'string'
    || typeof method['label'] !== 'string'
    || typeof method['last4'] !== 'string'
    || typeof method['brand'] !== 'string'
    || typeof method['createdAt'] !== 'string'
  ) {
    return null;
  }

  return {
    paymentMethodId: method['paymentMethodId'],
    label: method['label'],
    last4: method['last4'],
    brand: method['brand'],
    createdAt: method['createdAt'],
  };
}

function parsePaymentMethodList(payload: unknown): PaymentMethod[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => parsePaymentMethod(item))
    .filter((method): method is PaymentMethod => method != null);
}

type LoadCheckoutDataInput = {
  sessionToken: string;
  bookingId: string;
};

export type CheckoutLoadResult =
  | { status: 'handoff'; target: 'active-job' | 'booking-completion' }
  | { status: 'loaded'; requestedService: string; quote: Quote; paymentMethods: PaymentMethod[] }
  | { status: 'error'; message: string };

/**
 * Fetch order: booking status first (decides whether checkout is even reachable),
 * then the payment check is awaited BEFORE requesting a quote -- requestBookingQuote
 * is a POST that creates a quote when none exists, so running it in parallel with the
 * payment check would write a spurious quote for a booking that's already paid.
 * Payment-methods can run in parallel with the quote request since neither depends on
 * the other's result.
 */
export async function loadCheckoutData(
  input: LoadCheckoutDataInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckoutLoadResult> {
  const continuation = await loadBookingContinuation(
    { sessionToken: input.sessionToken, bookingId: input.bookingId },
    fetchImpl,
  );

  if (continuation.errorMessage) {
    return { status: 'error', message: continuation.errorMessage };
  }

  if (!continuation.booking) {
    return { status: 'error', message: 'Booking details are unavailable.' };
  }

  if (continuation.booking.status === 'completed') {
    return { status: 'handoff', target: 'booking-completion' };
  }

  if (continuation.booking.status !== 'accepted') {
    return { status: 'handoff', target: 'active-job' };
  }

  if (continuation.payment) {
    return { status: 'handoff', target: 'active-job' };
  }

  try {
    const [quoteResult, paymentMethods] = await Promise.all([
      requestQuote(input, fetchImpl),
      listPaymentMethods(input, fetchImpl),
    ]);

    if (quoteResult.status === 'expired-or-not-found') {
      return { status: 'handoff', target: 'active-job' };
    }

    if (quoteResult.status === 'error') {
      return { status: 'error', message: quoteResult.message };
    }

    return {
      status: 'loaded',
      requestedService: continuation.booking.requestedService,
      quote: quoteResult.quote,
      paymentMethods,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error loading checkout details.',
    };
  }
}

type RequestQuoteResult =
  | { status: 'ok'; quote: Quote }
  | { status: 'expired-or-not-found' }
  | { status: 'error'; message: string };

async function requestQuote(input: LoadCheckoutDataInput, fetchImpl: typeof fetch): Promise<RequestQuoteResult> {
  const request = createRequestBookingQuoteRequest(input.sessionToken, input.bookingId);
  const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
    method: request.method,
    headers: request.headers,
  });

  if (response.status === 409) {
    return { status: 'expired-or-not-found' };
  }

  if (!response.ok) {
    return { status: 'error', message: `Failed to request a quote with HTTP ${response.status}.` };
  }

  const quote = parseQuote(await response.json());

  if (!quote) {
    return { status: 'error', message: 'Quote response missing required fields.' };
  }

  return { status: 'ok', quote };
}

async function listPaymentMethods(input: LoadCheckoutDataInput, fetchImpl: typeof fetch): Promise<PaymentMethod[]> {
  const request = createListMyPaymentMethodsRequest(input.sessionToken);
  const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
    method: request.method,
    headers: request.headers,
  });

  if (!response.ok) {
    return [];
  }

  return parsePaymentMethodList(await response.json());
}

export type AddPaymentMethodResult =
  | { status: 'ok'; paymentMethod: PaymentMethod }
  | { status: 'error'; message: string };

/**
 * Adds a simulated Visa card -- last4 is server-generated (never real card data, per
 * slice 2's whitelist), so there's no card-entry form, just a single tap. Sends a fixed
 * label/brand so the resulting row reads "Visa ending in ####" like the design mockup,
 * not the server's generic "Payment method"/"card" defaults.
 */
export async function addPaymentMethodForCheckout(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AddPaymentMethodResult> {
  const request = createAddPaymentMethodRequest(sessionToken, { label: 'Visa', brand: 'visa' });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { status: 'error', message: `Failed to add a card with HTTP ${response.status}.` };
    }

    const paymentMethod = parsePaymentMethod(await response.json());

    if (!paymentMethod) {
      return { status: 'error', message: 'Add-card response missing required fields.' };
    }

    return { status: 'ok', paymentMethod };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error adding a card.',
    };
  }
}

type SubmitCheckoutInput = {
  sessionToken: string;
  bookingId: string;
  quoteId: string;
  paymentMethodId: string;
};

export type SubmitCheckoutResult =
  | { status: 'success'; paymentId: string }
  | { status: 'needs-reload' }
  | { status: 'error'; message: string };

/**
 * checkoutBooking returns 409 for two different reasons (expired/mismatched quote, or
 * the booking no longer being `accepted` -- e.g. the provider completed it mid-checkout)
 * and the status code alone doesn't distinguish them. Rather than string-match the
 * server's error message, any 409 here resolves to 'needs-reload': the caller re-runs
 * loadCheckoutData, which re-derives the correct outcome either way (fresh quote if
 * still accepted, handoff to /active-job if not).
 */
export async function submitCheckout(
  input: SubmitCheckoutInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitCheckoutResult> {
  const request = createCheckoutBookingRequest(input.sessionToken, input.bookingId, {
    quoteId: input.quoteId,
    paymentMethodId: input.paymentMethodId,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (response.status === 409) {
      return { status: 'needs-reload' };
    }

    if (!response.ok) {
      return { status: 'error', message: `Checkout failed with HTTP ${response.status}.` };
    }

    const payload = await response.json();
    const paymentId = payload !== null && typeof payload === 'object'
      ? (payload as Record<string, unknown>)['paymentId']
      : null;

    if (typeof paymentId !== 'string') {
      return { status: 'error', message: 'Checkout response missing required fields.' };
    }

    return { status: 'success', paymentId };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown checkout failure.',
    };
  }
}
