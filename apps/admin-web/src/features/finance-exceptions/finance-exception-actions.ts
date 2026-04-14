import {
  createGetPendingDisputesRequest,
  createResolveDisputeRequest,
  createStartReviewDisputeRequest,
} from '@quickwerk/api-client';
import type { DisputeRecord, DisputeStatus } from '@quickwerk/domain';

import {
  createFinanceEmptyState,
  createFinanceErrorState,
  createFinanceLoadedState,
  type FinanceExceptionResolutionState,
  type FinanceExceptionState,
  type FinanceExceptionSummary,
  type FinanceExceptionTriageActionType,
} from './finance-exception-state';

const PLATFORM_API_BASE_URL =
  typeof process !== 'undefined'
    ? (process.env['NEXT_PUBLIC_PLATFORM_API_BASE_URL'] ?? 'http://127.0.0.1:3101')
    : 'http://127.0.0.1:3101';

const disputeStatuses = new Set<DisputeRecord['status']>(['open', 'under-review', 'resolved', 'closed']);

const isDisputeRecord = (value: unknown): value is DisputeRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['disputeId'] === 'string' &&
    typeof record['bookingId'] === 'string' &&
    typeof record['reporterUserId'] === 'string' &&
    (record['reporterRole'] === 'customer' || record['reporterRole'] === 'provider') &&
    typeof record['category'] === 'string' &&
    typeof record['description'] === 'string' &&
    typeof record['status'] === 'string' &&
    disputeStatuses.has(record['status'] as DisputeRecord['status']) &&
    typeof record['createdAt'] === 'string'
  );
};

const isDisputeRecordArray = (value: unknown): value is DisputeRecord[] =>
  Array.isArray(value) && value.every(isDisputeRecord);

const classifyBillingAnomalyType = (description: string): FinanceExceptionSummary['anomalyType'] => {
  const normalized = description.toLowerCase();

  if (
    normalized.includes('blocked payout') ||
    normalized.includes('payout blocked') ||
    normalized.includes('payout on hold') ||
    normalized.includes('settlement blocked')
  ) {
    return 'payout-blocked';
  }

  if (
    normalized.includes('invoice missing') ||
    normalized.includes('missing invoice') ||
    normalized.includes('no invoice')
  ) {
    return 'invoice-missing';
  }

  if (
    normalized.includes('invoice mismatch') ||
    normalized.includes('customer mismatch') ||
    normalized.includes('wrong customer')
  ) {
    return 'invoice-customer-mismatch';
  }

  return 'payout-delayed';
};

const toResolutionState = (status: DisputeStatus): FinanceExceptionResolutionState => {
  if (status === 'under-review') {
    return 'manual-review';
  }

  if (status === 'resolved' || status === 'closed') {
    return 'resolved';
  }

  return 'new';
};

const toFinanceExceptionSummary = (dispute: DisputeRecord): FinanceExceptionSummary => ({
  exceptionId: `finance-${dispute.disputeId}`,
  disputeId: dispute.disputeId,
  bookingId: dispute.bookingId,
  providerUserId: dispute.reporterRole === 'provider' ? dispute.reporterUserId : 'unknown-provider',
  customerUserId: dispute.reporterRole === 'customer' ? dispute.reporterUserId : 'unknown-customer',
  anomalyType: classifyBillingAnomalyType(dispute.description),
  anomalyReason: dispute.description,
  disputeStatus: dispute.status,
  reportedAt: dispute.createdAt,
  resolutionState: toResolutionState(dispute.status),
});

const replaceDisputeInState = (
  state: FinanceExceptionState,
  dispute: DisputeRecord,
  actionType: FinanceExceptionTriageActionType,
): FinanceExceptionState => {
  if (state.status !== 'loaded') {
    return state;
  }

  const mapped = toFinanceExceptionSummary(dispute);

  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    const remaining = state.exceptions.filter((item) => item.disputeId !== dispute.disputeId);

    if (remaining.length === 0) {
      return createFinanceEmptyState();
    }

    return createFinanceLoadedState(remaining, {
      status: 'done',
      exceptionId: mapped.exceptionId,
      disputeId: mapped.disputeId,
      actionType,
    });
  }

  return createFinanceLoadedState(
    state.exceptions.map((item) => (item.disputeId === dispute.disputeId ? mapped : item)),
    {
      status: 'done',
      exceptionId: mapped.exceptionId,
      disputeId: mapped.disputeId,
      actionType,
    },
  );
};

const startAction = (
  state: FinanceExceptionState,
  exceptionId: string,
  disputeId: string,
  actionType: FinanceExceptionTriageActionType,
): FinanceExceptionState => {
  if (state.status !== 'loaded') {
    return state;
  }

  return createFinanceLoadedState(state.exceptions, {
    status: 'triaging',
    exceptionId,
    disputeId,
    actionType,
  });
};

const failAction = (
  state: FinanceExceptionState,
  exceptionId: string,
  disputeId: string,
  actionType: FinanceExceptionTriageActionType,
  errorMessage: string,
): FinanceExceptionState => {
  if (state.status !== 'loaded') {
    return createFinanceErrorState(errorMessage);
  }

  return createFinanceLoadedState(state.exceptions, {
    status: 'error',
    exceptionId,
    disputeId,
    actionType,
    errorMessage,
  });
};

async function transitionDispute(
  request:
    | ReturnType<typeof createStartReviewDisputeRequest>
    | ReturnType<typeof createResolveDisputeRequest>,
  fetchImpl: typeof fetch,
): Promise<{ dispute?: DisputeRecord; errorMessage?: string }> {
  const response = await fetchImpl(`${PLATFORM_API_BASE_URL}${request.path}`, {
    method: request.method,
    headers: request.headers,
    body: 'body' in request ? JSON.stringify(request.body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      errorMessage:
        typeof payload['message'] === 'string'
          ? payload['message']
          : `Finance triage transition failed: HTTP ${response.status}.`,
    };
  }

  const payload = (await response.json()) as unknown;

  if (!isDisputeRecord(payload)) {
    return {
      errorMessage: 'Unexpected dispute response format while triaging finance exception.',
    };
  }

  return { dispute: payload };
}

export async function loadFinanceExceptionState(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FinanceExceptionState> {
  const request = createGetPendingDisputesRequest(sessionToken);

  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return createFinanceErrorState(`Failed to load finance exceptions: HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;
    if (!isDisputeRecordArray(payload)) {
      return createFinanceErrorState('Unexpected response format for finance exceptions.');
    }

    const billingDisputes = payload.filter((dispute) => dispute.category === 'billing');

    if (billingDisputes.length === 0) {
      return createFinanceEmptyState();
    }

    return createFinanceLoadedState(billingDisputes.map(toFinanceExceptionSummary));
  } catch (error) {
    return createFinanceErrorState(error instanceof Error ? error.message : 'Unknown error loading finance exceptions.');
  }
}

export async function submitFinanceExceptionTriage(
  currentState: FinanceExceptionState,
  sessionToken: string,
  exceptionId: string,
  actionType: FinanceExceptionTriageActionType,
  fetchImpl: typeof fetch = fetch,
): Promise<FinanceExceptionState> {
  if (currentState.status !== 'loaded') {
    return currentState;
  }

  const exception = currentState.exceptions.find((item) => item.exceptionId === exceptionId);

  if (!exception) {
    return failAction(currentState, exceptionId, 'unknown-dispute', actionType, 'Finance exception no longer exists.');
  }

  const triagingState = startAction(currentState, exceptionId, exception.disputeId, actionType);

  try {
    if (actionType === 'acknowledge') {
      const startReviewRequest = createStartReviewDisputeRequest(sessionToken, exception.disputeId);
      const startReviewResult =
        exception.disputeStatus === 'open'
          ? await transitionDispute(startReviewRequest, fetchImpl)
          : { dispute: undefined as DisputeRecord | undefined };

      if (exception.disputeStatus === 'open' && !startReviewResult.dispute) {
        return failAction(
          triagingState,
          exceptionId,
          exception.disputeId,
          actionType,
          startReviewResult.errorMessage ?? 'Unable to start dispute review before acknowledge.',
        );
      }

      const resolveRequest = createResolveDisputeRequest(sessionToken, exception.disputeId, {
        resolutionNote: 'Acknowledged by finance/support exception cockpit.',
      });

      const resolveResult = await transitionDispute(resolveRequest, fetchImpl);
      if (!resolveResult.dispute) {
        return failAction(
          triagingState,
          exceptionId,
          exception.disputeId,
          actionType,
          resolveResult.errorMessage ?? 'Unable to acknowledge finance exception.',
        );
      }

      return replaceDisputeInState(triagingState, resolveResult.dispute, actionType);
    }

    if (exception.disputeStatus !== 'open') {
      return createFinanceLoadedState(currentState.exceptions, {
        status: 'done',
        exceptionId,
        disputeId: exception.disputeId,
        actionType,
      });
    }

    const startReviewRequest = createStartReviewDisputeRequest(sessionToken, exception.disputeId);
    const result = await transitionDispute(startReviewRequest, fetchImpl);

    if (!result.dispute) {
      return failAction(
        triagingState,
        exceptionId,
        exception.disputeId,
        actionType,
        result.errorMessage ?? 'Unable to route finance exception.',
      );
    }

    return replaceDisputeInState(triagingState, result.dispute, actionType);
  } catch (error) {
    return failAction(
      triagingState,
      exceptionId,
      exception.disputeId,
      actionType,
      error instanceof Error ? error.message : 'Unknown error triaging finance exception.',
    );
  }
}
