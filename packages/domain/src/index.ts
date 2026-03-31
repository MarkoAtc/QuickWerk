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
  'declined',
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
    declineReason?: string;
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

export type BookingDeclinedNotificationPayload = {
  channel: 'email' | 'push';
  recipientUserId: string;
  bookingId: string;
  correlationId: string;
  subject?: string;
  body: string;
  queuedAt: string;
};

// --- Payments ---

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export type PaymentRecord = {
  paymentId: string;
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  capturedAt: string;
  correlationId: string;
};

export type PaymentCapturedDomainEvent = {
  eventName: 'payment.captured';
  eventId: string;
  occurredAt: string;
  correlationId: string;
  replayed: boolean;
  payment: {
    paymentId: string;
    bookingId: string;
    customerUserId: string;
    providerUserId: string;
    amountCents: number;
    currency: string;
    status: 'captured';
  };
};

// --- File Uploads ---

export type UploadUrlRecord = {
  uploadId: string;
  providerUserId: string;
  presignedUrl: string;
  expiresAt: string;
  filename: string;
  mimeType: string;
};
