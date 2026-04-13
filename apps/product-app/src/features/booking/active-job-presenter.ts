import type {
  BookingContinuationPayment,
  BookingContinuationRecord,
  BookingContinuationStatus,
} from './active-job-screen-actions';

export type TimelineStepState = 'done' | 'active' | 'pending';

export type ActiveJobTimelineStep = {
  id: string;
  label: string;
  state: TimelineStepState;
};

export type ActiveJobViewModel = {
  bookingId: string;
  status: BookingContinuationStatus;
  statusLabel: string;
  headline: string;
  subheadline: string;
  requestedService: string;
  counterpartLabel: string;
  counterpartValue: string;
  paymentSummary: string;
  timeline: ActiveJobTimelineStep[];
  statusHistory: string[];
};

type ViewerRole = 'customer' | 'provider';

type PresentActiveJobInput = {
  viewerRole: ViewerRole;
  booking: BookingContinuationRecord;
  payment?: BookingContinuationPayment;
  warningMessage?: string;
};

const defaultStatusLabels: Record<BookingContinuationStatus, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
};

function resolveHeadline(status: BookingContinuationStatus): string {
  if (status === 'submitted') return 'Booking submitted';
  if (status === 'accepted') return 'Provider assigned';
  if (status === 'completed') return 'Booking completed';
  return 'Booking declined';
}

function resolveSubheadline(booking: BookingContinuationRecord): string {
  if (booking.status === 'submitted') {
    return 'We are waiting for a provider to accept this booking.';
  }

  if (booking.status === 'accepted') {
    if (booking.providerUserId) {
      return `Provider ${booking.providerUserId} accepted this booking.`;
    }

    return 'A provider accepted this booking.';
  }

  if (booking.status === 'completed') {
    return 'Service has been marked complete.';
  }

  return booking.declineReason
    ? `Declined: ${booking.declineReason}`
    : 'The provider declined this booking.';
}

function resolveTimeline(status: BookingContinuationStatus): ActiveJobTimelineStep[] {
  if (status === 'declined') {
    return [
      { id: 'submitted', label: 'Submitted', state: 'done' },
      { id: 'declined', label: 'Declined', state: 'active' },
    ];
  }

  const stepOrder: BookingContinuationStatus[] = ['submitted', 'accepted', 'completed'];
  const activeIndex = stepOrder.indexOf(status);

  return stepOrder.map((step, index) => {
    if (index < activeIndex) {
      return { id: step, label: defaultStatusLabels[step], state: 'done' };
    }

    if (index === activeIndex) {
      return { id: step, label: defaultStatusLabels[step], state: 'active' };
    }

    return { id: step, label: defaultStatusLabels[step], state: 'pending' };
  });
}

function formatAmount(amountCents: number, currency: string): string {
  const amount = (amountCents / 100).toFixed(2);
  return `${currency} ${amount}`;
}

function resolvePaymentSummary(payment?: BookingContinuationPayment, warningMessage?: string): string {
  if (payment) {
    return `Payment ${payment.status}: ${formatAmount(payment.amountCents, payment.currency)}`;
  }

  if (warningMessage) {
    return warningMessage;
  }

  return 'Payment details are not available yet.';
}

function resolveCounterpart(viewerRole: ViewerRole, booking: BookingContinuationRecord): {
  counterpartLabel: string;
  counterpartValue: string;
} {
  if (viewerRole === 'provider') {
    return {
      counterpartLabel: 'Customer',
      counterpartValue: booking.customerUserId,
    };
  }

  return {
    counterpartLabel: 'Provider',
    counterpartValue: booking.providerUserId ?? 'Not assigned yet',
  };
}

function resolveStatusHistory(booking: BookingContinuationRecord): string[] {
  return booking.statusHistory.map((event) => `${defaultStatusLabels[event.to]} at ${event.changedAt}`);
}

export function presentActiveJob(input: PresentActiveJobInput): ActiveJobViewModel {
  const counterpart = resolveCounterpart(input.viewerRole, input.booking);

  return {
    bookingId: input.booking.bookingId,
    status: input.booking.status,
    statusLabel: defaultStatusLabels[input.booking.status],
    headline: resolveHeadline(input.booking.status),
    subheadline: resolveSubheadline(input.booking),
    requestedService: input.booking.requestedService,
    counterpartLabel: counterpart.counterpartLabel,
    counterpartValue: counterpart.counterpartValue,
    paymentSummary: resolvePaymentSummary(input.payment, input.warningMessage),
    timeline: resolveTimeline(input.booking.status),
    statusHistory: resolveStatusHistory(input.booking),
  };
}
