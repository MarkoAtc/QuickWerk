import type { DisputeQueueState } from '../disputes/dispute-queue-state';
import type { FinanceExceptionState } from '../finance-exceptions/finance-exception-state';
import type { VerificationQueueState } from '../provider-review/verification-queue-state';

export type QueueStatusSummary = {
  badge: string;
  headline: string;
  detail: string;
};

export function describeVerificationQueue(state: VerificationQueueState): QueueStatusSummary {
  switch (state.status) {
    case 'loading':
      return {
        badge: 'loading',
        headline: 'Loading provider verification queue…',
        detail: 'Operator queue state is still being fetched.',
      };
    case 'empty':
      return {
        badge: 'clear',
        headline: 'No provider verifications are waiting.',
        detail: 'The onboarding review queue is currently empty.',
      };
    case 'error':
      return {
        badge: 'error',
        headline: 'Provider verification queue failed to load.',
        detail: state.errorMessage,
      };
    case 'loaded':
      return {
        badge: `${state.verifications.length} pending`,
        headline: 'Provider verification queue is live.',
        detail:
          state.reviewAction.status === 'error'
            ? state.reviewAction.errorMessage
            : 'Approve or reject pending provider onboarding submissions.',
      };
  }
}

export function describeDisputeQueue(state: DisputeQueueState): QueueStatusSummary {
  switch (state.status) {
    case 'loading':
      return {
        badge: 'loading',
        headline: 'Loading dispute queue…',
        detail: 'Open customer/provider disputes are still being fetched.',
      };
    case 'empty':
      return {
        badge: 'clear',
        headline: 'No active disputes need review.',
        detail: 'The operator dispute queue is currently empty.',
      };
    case 'error':
      return {
        badge: 'error',
        headline: 'Dispute queue failed to load.',
        detail: state.errorMessage,
      };
    case 'loaded':
      return {
        badge: `${state.disputes.length} pending`,
        headline: 'Dispute queue is live.',
        detail:
          state.queueAction.status === 'error'
            ? state.queueAction.errorMessage
            : 'Move disputes through review, resolution, or closure.',
      };
  }
}

export function describeFinanceExceptionQueue(state: FinanceExceptionState): QueueStatusSummary {
  switch (state.status) {
    case 'loading':
      return {
        badge: 'loading',
        headline: 'Loading finance/support exceptions…',
        detail: 'Payout and invoice anomaly signals are still being fetched.',
      };
    case 'empty':
      return {
        badge: 'clear',
        headline: 'No finance/support exceptions need review.',
        detail: 'No payout/invoice billing anomalies are currently active.',
      };
    case 'error':
      return {
        badge: 'error',
        headline: 'Finance/support exceptions failed to load.',
        detail: state.errorMessage,
      };
    case 'loaded':
      return {
        badge: `${state.exceptions.length} pending`,
        headline: 'Finance/support exception cockpit is live.',
        detail:
          state.queueAction.status === 'error'
            ? state.queueAction.errorMessage
            : 'Acknowledge anomalies, mark follow-up, or route into dispute/manual review.',
      };
  }
}
