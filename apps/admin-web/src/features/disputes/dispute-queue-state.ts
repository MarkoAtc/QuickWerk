import {
  disputeOperatorActionTransitions,
  type DisputeOperatorActionType,
  type DisputeRecord,
} from '@quickwerk/domain';

export type DisputeQueueActionType = DisputeOperatorActionType;

export type DisputeQueueAction =
  | { status: 'idle' }
  | { status: 'transitioning'; disputeId: string; actionType: DisputeQueueActionType }
  | { status: 'done'; disputeId: string; actionType: DisputeQueueActionType }
  | { status: 'error'; disputeId: string; actionType: DisputeQueueActionType; errorMessage: string };

export type DisputeQueueState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; disputes: DisputeRecord[]; queueAction: DisputeQueueAction }
  | { status: 'error'; errorMessage: string };

export const createLoadingState = (): DisputeQueueState => ({ status: 'loading' });
export const createEmptyState = (): DisputeQueueState => ({ status: 'empty' });
export const createLoadedState = (disputes: DisputeRecord[]): DisputeQueueState => ({
  status: 'loaded',
  disputes,
  queueAction: { status: 'idle' },
});
export const createErrorState = (errorMessage: string): DisputeQueueState => ({ status: 'error', errorMessage });

export const beginOptimisticDisputeTransition = (
  state: DisputeQueueState,
  disputeId: string,
  actionType: DisputeQueueActionType,
): DisputeQueueState => {
  if (state.status !== 'loaded') {
    return state;
  }

  if (state.queueAction?.status === 'transitioning') {
    return state;
  }

  const dispute = state.disputes.find((d) => d.disputeId === disputeId);
  if (!dispute) {
    return state;
  }

  const nextStatus = disputeOperatorActionTransitions[actionType];
  if (!nextStatus || nextStatus === dispute.status) {
    return state;
  }

  const disputes = state.disputes.map((d) => {
    if (d.disputeId !== disputeId) {
      return d;
    }

    return { ...d, status: nextStatus };
  });

  return {
    ...state,
    disputes,
    queueAction: { status: 'transitioning', disputeId, actionType },
  };
};

export const applyDisputeTransitionSuccess = (
  state: DisputeQueueState,
  dispute: DisputeRecord,
  actionType: DisputeQueueActionType,
): DisputeQueueState => {
  if (state.status !== 'loaded') {
    return state;
  }

  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    const remaining = state.disputes.filter((item) => item.disputeId !== dispute.disputeId);
    if (remaining.length === 0) {
      return createEmptyState();
    }

    return {
      status: 'loaded',
      disputes: remaining,
      queueAction: { status: 'done', disputeId: dispute.disputeId, actionType },
    };
  }

  return {
    status: 'loaded',
    disputes: state.disputes.map((item) => (item.disputeId === dispute.disputeId ? dispute : item)),
    queueAction: { status: 'done', disputeId: dispute.disputeId, actionType },
  };
};

export const rollbackDisputeTransition = (
  state: DisputeQueueState,
  previousState: DisputeQueueState,
  disputeId: string,
  actionType: DisputeQueueActionType,
  errorMessage: string,
): DisputeQueueState => {
  if (previousState.status !== 'loaded') {
    return createErrorState(errorMessage);
  }

  return {
    ...previousState,
    queueAction: { status: 'error', disputeId, actionType, errorMessage },
  };
};