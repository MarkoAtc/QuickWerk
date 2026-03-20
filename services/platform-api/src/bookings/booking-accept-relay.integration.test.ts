import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { correlationIdHeaderName } from '../observability/correlation-id';
import {
  BOOKING_ACCEPTED_RELAY_CLOCK,
  type BookingAcceptedRelayClock,
} from '../orchestration/relay-clock';
import {
  BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY,
  type BookingAcceptedRelayAttemptPolicy,
} from '../orchestration/relay-attempt-policy';
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

function collectStructuredLogs() {
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

  return logs;
}

function createFailUntilAttemptPolicy(failingAttemptCount: number): BookingAcceptedRelayAttemptPolicy {
  return {
    shouldFailAttempt({ attempt }) {
      return attempt <= failingAttemptCount;
    },
  };
}

function createFixedClock(isoInstants: string[]): BookingAcceptedRelayClock {
  let index = 0;

  return {
    now() {
      const selected = isoInstants[Math.min(index, isoInstants.length - 1)] ?? isoInstants[0];
      index += 1;
      return new Date(selected);
    },
  };
}

function expectSortedObjectKeys(input: Record<string, unknown>, expectedKeys: string[]) {
  expect(Object.keys(input).sort()).toEqual([...expectedKeys].sort());
}

function expectIsoTimestamp(value: unknown) {
  expect(typeof value).toBe('string');
  expect(value as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}

type RunAcceptBookingFlowInput = {
  requestCorrelationId?: string;
  relayAttemptPolicy?: BookingAcceptedRelayAttemptPolicy;
  relayClock?: BookingAcceptedRelayClock;
};

async function runAcceptBookingFlow(input: RunAcceptBookingFlowInput = {}) {
  const testingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (input.relayAttemptPolicy) {
    testingModuleBuilder
      .overrideProvider(BOOKING_ACCEPTED_RELAY_ATTEMPT_POLICY)
      .useValue(input.relayAttemptPolicy);
  }

  if (input.relayClock) {
    testingModuleBuilder
      .overrideProvider(BOOKING_ACCEPTED_RELAY_CLOCK)
      .useValue(input.relayClock);
  }

  const moduleRef = await testingModuleBuilder.compile();

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
    [correlationIdHeaderName]: input.requestCorrelationId,
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

  return {
    app,
    acceptResponse,
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
    const logs = collectStructuredLogs();
    const { app, acceptResponse } = await runAcceptBookingFlow({ requestCorrelationId });

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

  it('covers retry relay progression (attempt 2..N) with deterministic backoff metadata', async () => {
    const logs = collectStructuredLogs();

    const { app, acceptResponse } = await runAcceptBookingFlow({
      requestCorrelationId: 'corr-retry-progression-001',
      relayAttemptPolicy: createFailUntilAttemptPolicy(2),
    });
    const resolvedCorrelationId = acceptResponse.headers[correlationIdHeaderName];

    const relayAttemptEvents = logs.filter(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay.attempt' &&
        entry.correlationId === resolvedCorrelationId,
    );

    expect(relayAttemptEvents).toHaveLength(3);

    const attemptSummary = relayAttemptEvents.map((entry) => {
      const details = entry.details as Record<string, unknown>;
      const retry = details.retry as Record<string, unknown>;

      return {
        workerStatus: details.workerStatus,
        attempt: retry.attempt,
        backoffMs: retry.backoffMs,
      };
    });

    expect(attemptSummary).toEqual([
      { workerStatus: 'retry-scheduled', attempt: 1, backoffMs: 1000 },
      { workerStatus: 'retry-scheduled', attempt: 2, backoffMs: 2000 },
      { workerStatus: 'processed', attempt: 3, backoffMs: 4000 },
    ]);

    const relayResultEvent = logs.find(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay' &&
        entry.correlationId === resolvedCorrelationId,
    );

    const relayDetails = relayResultEvent?.details as Record<string, unknown>;
    const retryMetadata = relayDetails.retry as Record<string, unknown>;
    expect(relayDetails.workerStatus).toBe('processed');
    expect(retryMetadata.attempt).toBe(3);
    expect(retryMetadata.backoffMs).toBe(4000);

    await app.close();
  });

  it('keeps nextAttemptAt deterministic at clock-boundary instants via injected fixed clock seam', async () => {
    const logs = collectStructuredLogs();

    const { app, acceptResponse } = await runAcceptBookingFlow({
      requestCorrelationId: 'corr-fixed-clock-001',
      relayAttemptPolicy: createFailUntilAttemptPolicy(2),
      relayClock: createFixedClock([
        '2026-03-20T10:00:00.999Z',
        '2026-03-20T10:00:01.999Z',
        '2026-03-20T10:00:03.999Z',
      ]),
    });
    const resolvedCorrelationId = acceptResponse.headers[correlationIdHeaderName];

    const relayAttemptEvents = logs.filter(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay.attempt' &&
        entry.correlationId === resolvedCorrelationId,
    );

    const attemptRetryMetadata = relayAttemptEvents.map((entry) => {
      const details = entry.details as Record<string, unknown>;
      return details.retry as Record<string, unknown>;
    });

    expect(attemptRetryMetadata.map((retry) => retry.nextAttemptAt)).toEqual([
      '2026-03-20T10:00:01.999Z',
      '2026-03-20T10:00:03.999Z',
      '2026-03-20T10:00:07.999Z',
    ]);

    await app.close();
  });

  it('proves exhausted attempts propagate terminal DLQ marker with dead-letter outcome', async () => {
    const logs = collectStructuredLogs();

    const { app, acceptResponse } = await runAcceptBookingFlow({
      requestCorrelationId: 'corr-dead-letter-001',
      relayAttemptPolicy: createFailUntilAttemptPolicy(3),
    });
    const resolvedCorrelationId = acceptResponse.headers[correlationIdHeaderName];

    const relayAttemptEvents = logs.filter(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay.attempt' &&
        entry.correlationId === resolvedCorrelationId,
    );

    expect(relayAttemptEvents).toHaveLength(3);

    const finalAttemptDetails = relayAttemptEvents.at(-1)?.details as Record<string, unknown>;
    const finalAttemptRetry = finalAttemptDetails.retry as Record<string, unknown>;
    const finalAttemptDlq = finalAttemptDetails.dlq as Record<string, unknown>;

    expect(finalAttemptDetails.workerStatus).toBe('dead-letter');
    expect(finalAttemptRetry.attempt).toBe(3);
    expect(finalAttemptRetry.backoffMs).toBe(4000);
    expect(finalAttemptDlq).toMatchObject({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
    });

    const relayResultEvent = logs.find(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay' &&
        entry.correlationId === resolvedCorrelationId,
    );

    const relayDetails = relayResultEvent?.details as Record<string, unknown>;
    const relayDlq = relayDetails.dlq as Record<string, unknown>;

    expect(relayDetails.workerStatus).toBe('dead-letter');
    expect(relayDlq).toMatchObject({
      terminal: true,
      queueName: 'booking.accepted.dlq',
      reason: 'max-attempts-exhausted',
    });

    await app.close();
  });

  it('freezes contract shape for booking.accepted.domain-event.relay.attempt structured logs', async () => {
    const logs = collectStructuredLogs();
    const requestCorrelationId = 'corr-relay-attempt-contract-001';

    const { app } = await runAcceptBookingFlow({
      requestCorrelationId,
      relayAttemptPolicy: createFailUntilAttemptPolicy(1),
    });

    const firstRelayAttemptEvent = logs.find(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay.attempt' &&
        entry.correlationId === requestCorrelationId,
    );

    expect(firstRelayAttemptEvent).toBeTruthy();

    const attemptEvent = firstRelayAttemptEvent as Record<string, unknown>;
    expectSortedObjectKeys(attemptEvent, ['source', 'timestamp', 'event', 'correlationId', 'status', 'details']);
    expect(attemptEvent.source).toBe('@quickwerk/platform-api');
    expectIsoTimestamp(attemptEvent.timestamp);
    expect(attemptEvent.event).toBe('booking.accepted.domain-event.relay.attempt');
    expect(attemptEvent.correlationId).toBe(requestCorrelationId);
    expect(attemptEvent.status).toBe('started');

    const details = attemptEvent.details as Record<string, unknown>;
    expectSortedObjectKeys(details, ['eventId', 'workerStatus', 'workerCorrelationId', 'retry']);
    expect(details.eventId).toEqual(expect.any(String));
    expect(details.workerStatus).toBe('retry-scheduled');
    expect(details.workerCorrelationId).toBe(requestCorrelationId);

    const retry = details.retry as Record<string, unknown>;
    expectSortedObjectKeys(retry, ['strategy', 'attempt', 'maxAttempts', 'backoffMs', 'nextAttemptAt']);
    expect(retry.strategy).toBe('deterministic-exponential-v1');
    expect(retry.attempt).toBe(1);
    expect(retry.maxAttempts).toBe(3);
    expect(retry.backoffMs).toBe(1000);
    expectIsoTimestamp(retry.nextAttemptAt);

    await app.close();
  });

  it('freezes contract shape for booking.accepted.domain-event.relay structured logs', async () => {
    const logs = collectStructuredLogs();
    const requestCorrelationId = 'corr-relay-final-contract-001';

    const { app } = await runAcceptBookingFlow({
      requestCorrelationId,
      relayAttemptPolicy: createFailUntilAttemptPolicy(3),
    });

    const relayResultEvent = logs.find(
      (entry) =>
        entry.event === 'booking.accepted.domain-event.relay' &&
        entry.correlationId === requestCorrelationId,
    );

    expect(relayResultEvent).toBeTruthy();

    const finalEvent = relayResultEvent as Record<string, unknown>;
    expectSortedObjectKeys(finalEvent, ['source', 'timestamp', 'event', 'correlationId', 'status', 'details']);
    expect(finalEvent.source).toBe('@quickwerk/platform-api');
    expectIsoTimestamp(finalEvent.timestamp);
    expect(finalEvent.event).toBe('booking.accepted.domain-event.relay');
    expect(finalEvent.correlationId).toBe(requestCorrelationId);
    expect(finalEvent.status).toBe('failed');

    const details = finalEvent.details as Record<string, unknown>;
    expectSortedObjectKeys(details, ['eventId', 'workerStatus', 'workerCorrelationId', 'retry', 'dlq']);
    expect(details.eventId).toEqual(expect.any(String));
    expect(details.workerStatus).toBe('dead-letter');
    expect(details.workerCorrelationId).toBe(requestCorrelationId);

    const retry = details.retry as Record<string, unknown>;
    expectSortedObjectKeys(retry, ['strategy', 'attempt', 'maxAttempts', 'backoffMs', 'nextAttemptAt']);
    expect(retry.strategy).toBe('deterministic-exponential-v1');
    expect(retry.attempt).toBe(3);
    expect(retry.maxAttempts).toBe(3);
    expect(retry.backoffMs).toBe(4000);
    expectIsoTimestamp(retry.nextAttemptAt);

    const dlq = details.dlq as Record<string, unknown>;
    expectSortedObjectKeys(dlq, ['terminal', 'queueName', 'reason', 'markedAt']);
    expect(dlq.terminal).toBe(true);
    expect(dlq.queueName).toBe('booking.accepted.dlq');
    expect(dlq.reason).toBe('max-attempts-exhausted');
    expectIsoTimestamp(dlq.markedAt);

    await app.close();
  });
});
