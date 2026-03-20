import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { AppModule } from '../app.module';
import { correlationIdHeaderName } from '../observability/correlation-id';
import { BookingsController } from './bookings.controller';

type RequestLike = {
  method: string;
  path: string;
  header(name: string): string | undefined;
};

type ResponseLike = {
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
};

function createRequest(input: {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
}): RequestLike {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    method: input.method,
    path: input.path,
    header(name: string) {
      return normalizedHeaders[name.toLowerCase()];
    },
  };
}

function createResponse(): ResponseLike {
  return {
    headers: {},
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

describe('booking accept relay integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {
      name: 'uses caller-provided correlation id',
      requestCorrelationId: 'corr-client-header-123',
    },
    {
      name: 'generates deterministic fallback correlation id',
      requestCorrelationId: undefined,
    },
  ])('$name', async ({ requestCorrelationId }) => {
    const logs: Array<Record<string, unknown>> = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      if (typeof message !== 'string') {
        return;
      }

      try {
        logs.push(JSON.parse(message) as Record<string, unknown>);
      } catch {
        // ignore non-JSON logs
      }
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const authService = app.get(AuthService);
    const bookingsController = app.get(BookingsController);

    const customerSession = await authService.signIn({
      email: 'customer@quickwerk.local',
      role: 'customer',
    });
    const providerSession = await authService.signIn({
      email: 'provider@quickwerk.local',
      role: 'provider',
    });

    const createBookingResponse = createResponse();
    const createdBooking = await bookingsController.createBooking(
      createRequest({
        method: 'POST',
        path: '/api/v1/bookings',
      }),
      createBookingResponse,
      `Bearer ${customerSession.token}`,
      {
        requestedService: 'Emergency plumbing',
      },
    );

    const acceptHeaders: Record<string, string | undefined> = {
      authorization: `Bearer ${providerSession.token}`,
      [correlationIdHeaderName]: requestCorrelationId,
    };
    const acceptRequest = createRequest({
      method: 'POST',
      path: `/api/v1/bookings/${createdBooking.bookingId}/accept`,
      headers: acceptHeaders,
    });
    const acceptResponse = createResponse();

    await bookingsController.acceptBooking(
      acceptRequest,
      acceptResponse,
      acceptHeaders.authorization,
      createdBooking.bookingId,
    );

    const resolvedCorrelationId = acceptResponse.headers[correlationIdHeaderName];
    expect(resolvedCorrelationId).toBeTruthy();

    if (requestCorrelationId) {
      expect(resolvedCorrelationId).toBe(requestCorrelationId);
    } else {
      expect(resolvedCorrelationId).toMatch(/^corr-[a-z0-9]+$/);
    }

    const emittedDomainEvent = logs.find(
      (entry) => entry.event === 'booking.accepted.domain-event.emit',
    );
    const relayResultEvent = logs.find(
      (entry) => entry.event === 'booking.accepted.domain-event.relay',
    );
    const workerConsumeStarted = logs.find(
      (entry) =>
        entry.source === '@quickwerk/background-workers' &&
        entry.event === 'booking.accepted.worker-consume' &&
        entry.status === 'started',
    );

    expect(emittedDomainEvent?.correlationId).toBe(resolvedCorrelationId);
    expect(workerConsumeStarted?.correlationId).toBe(resolvedCorrelationId);
    expect(relayResultEvent?.correlationId).toBe(resolvedCorrelationId);

    const relayDetails = relayResultEvent?.details as Record<string, unknown>;
    expect(relayDetails.workerStatus).toBe('processed');
    expect(relayDetails.workerCorrelationId).toBe(resolvedCorrelationId);

    const retryMetadata = relayDetails.retry as Record<string, unknown>;
    expect(retryMetadata.strategy).toBe('deterministic-exponential-v1');
    expect(retryMetadata.attempt).toBe(1);
    expect(retryMetadata.maxAttempts).toBe(3);

    await app.close();
  });
});
