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

// --- Payouts ---

export type PayoutStatus = 'pending' | 'processing' | 'settled' | 'failed';

export type PayoutRecord = {
  payoutId: string;
  providerUserId: string;
  bookingId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  settlementRef: string | null;
  createdAt: string;
  settledAt: string | null;
};

export type PayoutCreatedDomainEvent = {
  type: 'payout.created';
  payoutId: string;
  bookingId: string;
  providerUserId: string;
  amountCents: number;
  currency: string;
  correlationId: string;
  occurredAt: string;
};

export type PayoutCreatedWorkerEnvelope = {
  event: PayoutCreatedDomainEvent;
  strategy: 'deterministic-exponential-v1';
  attempt: number;
  maxAttempts: number;
  backoffMs: number;
  nextAttemptAt: string;
};

// --- Invoices ---

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
};

export type InvoiceStatus = 'draft' | 'issued' | 'void';

export type InvoiceRecord = {
  invoiceId: string;
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
};

// --- Reviews ---

export type ReviewStatus = 'submitted' | 'moderated' | 'removed';

export type ReviewRecord = {
  reviewId: string;
  bookingId: string;
  customerUserId: string;
  providerUserId: string;
  authorRole: 'customer' | 'provider';
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
};

export type ReviewSubmittedDomainEvent = {
  type: 'review.submitted';
  reviewId: string;
  bookingId: string;
  providerUserId: string;
  rating: number;
  correlationId: string;
  occurredAt: string;
};

// --- Disputes ---

export type DisputeStatus = 'open' | 'under-review' | 'resolved' | 'closed';

export type DisputeCategory = 'no-show' | 'quality' | 'billing' | 'safety' | 'other';

export type DisputeRecord = {
  disputeId: string;
  bookingId: string;
  reporterUserId: string;
  reporterRole: 'customer' | 'provider';
  category: DisputeCategory;
  description: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export type DisputeSubmittedDomainEvent = {
  type: 'dispute.submitted';
  disputeId: string;
  bookingId: string;
  reporterUserId: string;
  category: DisputeCategory;
  correlationId: string;
  occurredAt: string;
};

export type DisputeOperatorActionType = 'startReview' | 'resolve' | 'close';

export type StartDisputeReviewAction = {
  type: 'startReview';
};

export type ResolveDisputeAction = {
  type: 'resolve';
  resolutionNote: string;
};

export type CloseDisputeAction = {
  type: 'close';
  resolutionNote?: string;
};

export type DisputeOperatorAction = StartDisputeReviewAction | ResolveDisputeAction | CloseDisputeAction;

export const disputeOperatorActionTransitions: Record<DisputeOperatorActionType, DisputeStatus> = {
  startReview: 'under-review',
  resolve: 'resolved',
  close: 'closed',
};

const disputeOperatorActionAllowedFromStatuses: Record<DisputeOperatorActionType, DisputeStatus[]> = {
  startReview: ['open'],
  resolve: ['under-review'],
  close: ['under-review'],
};

export const canApplyDisputeOperatorAction = (
  currentStatus: DisputeStatus,
  action: DisputeOperatorActionType,
): boolean => disputeOperatorActionAllowedFromStatuses[action].includes(currentStatus);
