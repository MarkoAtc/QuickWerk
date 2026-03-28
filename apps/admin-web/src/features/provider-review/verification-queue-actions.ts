import {
  createListPendingVerificationsRequest,
  createReviewVerificationRequest,
} from '@quickwerk/api-client';

import { VerificationQueueState, VerificationSummary, applyReviewDecision, createEmptyQueueState, createLoadedQueueState, createQueueErrorState } from './verification-queue-state';

const PLATFORM_API_BASE_URL =
  typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_PLATFORM_API_BASE_URL'] ?? 'http://127.0.0.1:3101') : 'http://127.0.0.1:3101';

type LoadQueueResult =
  | { verifications: VerificationSummary[]; errorMessage?: undefined }
  | { verifications?: undefined; errorMessage: string };

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

    if (!Array.isArray(payload)) {
      return { errorMessage: 'Unexpected response format for pending verifications.' };
    }

    return { verifications: payload as VerificationSummary[] };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown error loading verification queue.',
    };
  }
}

type ReviewResult =
  | { verification: VerificationSummary; errorMessage?: undefined }
  | { verification?: undefined; errorMessage: string };

export async function reviewVerification(
  sessionToken: string,
  verificationId: string,
  decision: 'approved' | 'rejected',
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
      return { errorMessage: message };
    }

    const verification = (await response.json()) as VerificationSummary;
    return { verification };
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
  decision: 'approved' | 'rejected',
  reviewNote?: string,
  fetchImpl?: typeof fetch,
): Promise<VerificationQueueState> {
  const result = await reviewVerification(sessionToken, verificationId, decision, reviewNote, fetchImpl);

  if (result.errorMessage) {
    if (currentState.status !== 'loaded') {
      return createQueueErrorState(result.errorMessage);
    }
    return {
      ...currentState,
      reviewAction: { status: 'error', verificationId, errorMessage: result.errorMessage },
    };
  }

  return applyReviewDecision(currentState, verificationId, decision);
}
