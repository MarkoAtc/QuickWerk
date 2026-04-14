import type { DisputeStatus } from '@quickwerk/domain';

export type FinanceExceptionType =
  | 'payout-delayed'
  | 'payout-blocked'
  | 'invoice-missing'
  | 'invoice-customer-mismatch';

export type FinanceExceptionResolutionState = 'new' | 'manual-review' | 'resolved';

export type FinanceExceptionSummary = {
  exceptionId: string;
  disputeId: string;
  bookingId: string;
  providerUserId: string;
  customerUserId: string;
  anomalyType: FinanceExceptionType;
  anomalyReason: string;
  disputeStatus: DisputeStatus;
  reportedAt: string;
  resolutionState: FinanceExceptionResolutionState;
};

export type FinanceExceptionTriageActionType = 'acknowledge' | 'followUp' | 'routeToDispute';

export type FinanceExceptionQueueAction =
  | { status: 'idle' }
  | {
      status: 'triaging';
      exceptionId: string;
      disputeId: string;
      actionType: FinanceExceptionTriageActionType;
    }
  | {
      status: 'done';
      exceptionId: string;
      disputeId: string;
      actionType: FinanceExceptionTriageActionType;
    }
  | {
      status: 'error';
      exceptionId: string;
      disputeId: string;
      actionType: FinanceExceptionTriageActionType;
      errorMessage: string;
    };

export type FinanceExceptionState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; exceptions: FinanceExceptionSummary[]; queueAction: FinanceExceptionQueueAction }
  | { status: 'error'; errorMessage: string };

export const createFinanceLoadingState = (): FinanceExceptionState => ({ status: 'loading' });
export const createFinanceEmptyState = (): FinanceExceptionState => ({ status: 'empty' });
export const createFinanceErrorState = (errorMessage: string): FinanceExceptionState => ({ status: 'error', errorMessage });

export const createFinanceLoadedState = (
  exceptions: FinanceExceptionSummary[],
  queueAction: FinanceExceptionQueueAction = { status: 'idle' },
): FinanceExceptionState => ({
  status: 'loaded',
  exceptions,
  queueAction,
});
