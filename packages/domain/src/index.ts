export const userRoles = [
  'customer',
  'provider-user',
  'provider-admin',
  'support-agent',
  'finance-user',
  'platform-admin',
] as const;

export const bookingStatuses = [
  'draft',
  'submitted',
  'broadcast',
  'accepted',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
] as const;

export const providerOnboardingSteps = [
  {
    id: 'account-setup',
    label: 'Create provider account',
  },
  {
    id: 'business-profile',
    label: 'Complete business profile',
  },
  {
    id: 'service-area',
    label: 'Set service area and trades',
  },
  {
    id: 'verification-documents',
    label: 'Upload verification documents',
  },
] as const;

export const correlationIdHeaderName = 'x-correlation-id' as const;

export type BookingAcceptedDomainEvent = {
  eventName: 'booking.accepted';
  eventId: string;
  occurredAt: string;
  correlationId: string;
  replayed: boolean;
  booking: {
    bookingId: string;
    customerUserId: string;
    providerUserId: string;
    requestedService: string;
    status: 'accepted';
  };
};

export type BookingDeclinedDomainEvent = {
  eventName: 'booking.declined';
  eventId: string;
  occurredAt: string;
  correlationId: string;
  replayed: boolean;
  booking: {
    bookingId: string;
    customerUserId: string;
    providerUserId: string;
    requestedService: string;
    status: 'declined';
  };
};

export type BookingAcceptedRetryBackoffMetadata = {
  strategy: 'deterministic-exponential-v1';
  attempt: number;
  maxAttempts: number;
  backoffMs: number;
  nextAttemptAt: string;
};

export type BookingAcceptedDlqMarker = {
  terminal: true;
  queueName: 'booking.accepted.dlq';
  reason: 'max-attempts-exhausted';
  markedAt: string;
};

export type BookingAcceptedWorkerEnvelope = {
  eventName: 'booking.accepted';
  correlationId: string;
  event: BookingAcceptedDomainEvent;
  retry: BookingAcceptedRetryBackoffMetadata;
  dlq?: BookingAcceptedDlqMarker;
};

export type BookingDeclinedRetryBackoffMetadata = {
  strategy: 'deterministic-exponential-v1';
  attempt: number;
  maxAttempts: number;
  backoffMs: number;
  nextAttemptAt: string;
};

export type BookingDeclinedDlqMarker = {
  terminal: true;
  queueName: 'booking.declined.dlq';
  reason: 'max-attempts-exhausted';
  markedAt: string;
};

export type BookingDeclinedWorkerEnvelope = {
  eventName: 'booking.declined';
  correlationId: string;
  event: BookingDeclinedDomainEvent;
  retry: BookingDeclinedRetryBackoffMetadata;
  dlq?: BookingDeclinedDlqMarker;
};
