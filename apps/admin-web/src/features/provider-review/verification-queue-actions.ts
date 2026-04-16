import {
  createListPendingVerificationsRequest,
  createReviewVerificationRequest,
} from '@quickwerk/api-client';

import {
  VerificationQueueState,
  VerificationSummary,
  applyReviewDecision,
  createEmptyQueueState,
  createLoadedQueueState,
  createQueueErrorState,
} from './verification-queue-state';

const PLATFORM_API_BASE_URL =
  typeof process !== 'undefined'
    ? (process.env['NEXT_PUBLIC_PLATFORM_API_BASE_URL'] ?? 'http://127.0.0.1:3101')
    : 'http://127.0.0.1:3101';

type LoadQueueResult =
  | { verifications: VerificationSummary[]; errorMessage?: undefined }
  | { verifications?: undefined; errorMessage: string };

const isVerificationSummary = (value: unknown): value is VerificationSummary => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record['verificationId'] === 'string' &&
    typeof record['providerUserId'] === 'string' &&
    typeof record['providerEmail'] === 'string' &&
    Array.isArray(record['tradeCategories']) &&
    Array.isArray(record['documents']) &&
    (record['status'] === 'pending'
      || record['status'] === 'approved'
      || record['status'] === 'rejected'
      || record['status'] === 'request-more-info') &&
    typeof record['submittedAt'] === 'string'
  );
};

const isVerificationSummaryArray = (value: unknown): value is VerificationSummary[] =>
  Array.isArray(value) && value.every(isVerificationSummary);

export async function loadPendingVerifications(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadQueueResult> {
  const request = createListPendingVerificationsRequest(sessionToken);

  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { errorMessage: `Failed to load pending verifications: HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as unknown;

    if (!isVerificationSummaryArray(payload)) {
      return { errorMessage: 'Unexpected response format for pending verifications.' };
    }

    return { verifications: payload };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown error loading verification queue.',
    };
  }
}

type ReviewResult =
  | { verification: VerificationSummary; errorMessage?: undefined; statusCode?: undefined }
  | { verification?: undefined; errorMessage: string; statusCode?: number };

export async function reviewVerification(
  sessionToken: string,
  verificationId: string,
  decision: 'approved' | 'rejected' | 'request-more-info',
  reviewNote?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewResult> {
  const request = createReviewVerificationRequest(sessionToken, verificationId, { decision, reviewNote });

  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const message =
        typeof errorBody['message'] === 'string'
          ? errorBody['message']
          : `Review action failed: HTTP ${response.status}.`;
      return { errorMessage: message, statusCode: response.status };
    }

    const verificationPayload = (await response.json()) as unknown;

    if (!isVerificationSummary(verificationPayload)) {
      return { errorMessage: 'Unexpected response format for review action.', statusCode: response.status };
    }

    return { verification: verificationPayload };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown error during review action.',
    };
  }
}

export async function loadQueueState(
  sessionToken: string,
  fetchImpl?: typeof fetch,
): Promise<VerificationQueueState> {
  const result = await loadPendingVerifications(sessionToken, fetchImpl);

  if (result.errorMessage) {
    return createQueueErrorState(result.errorMessage);
  }

  if (!result.verifications || result.verifications.length === 0) {
    return createEmptyQueueState();
  }

  return createLoadedQueueState(result.verifications);
}

export async function submitReviewDecision(
  currentState: VerificationQueueState,
  sessionToken: string,
  verificationId: string,
  decision: 'approved' | 'rejected' | 'request-more-info',
  reviewNote?: string,
  fetchImpl?: typeof fetch,
): Promise<VerificationQueueState> {
  const result = await reviewVerification(sessionToken, verificationId, decision, reviewNote, fetchImpl);

  if (result.errorMessage) {
    if (currentState.status !== 'loaded') {
      return createQueueErrorState(result.errorMessage);
    }

    if (result.statusCode === 404 || result.statusCode === 409) {
      return {
        ...currentState,
        verifications: currentState.verifications.filter((v) => v.verificationId !== verificationId),
        reviewAction: { status: 'error', verificationId, errorMessage: result.errorMessage },
      };
    }

    return {
      ...currentState,
      reviewAction: { status: 'error', verificationId, errorMessage: result.errorMessage },
    };
  }

  return applyReviewDecision(currentState, verificationId, decision);
}
