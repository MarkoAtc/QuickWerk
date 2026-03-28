import {
  createGetMyVerificationStatusRequest,
  createSubmitVerificationRequest,
} from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';
import {
  OnboardingFormData,
  ProviderOnboardingState,
  VerificationRecord,
  createCheckingState,
  createErrorState,
  resolveVerificationStateFromRecord,
} from './onboarding-state';

type FetchVerificationStatusResult =
  | { verification: VerificationRecord | null; errorMessage?: undefined }
  | { verification?: undefined; errorMessage: string };

function isVerificationRecord(value: unknown): value is VerificationRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record['verificationId'] !== 'string') {
    return false;
  }

  if (record['status'] !== 'pending' && record['status'] !== 'approved' && record['status'] !== 'rejected') {
    return false;
  }

  if (typeof record['submittedAt'] !== 'string') {
    return false;
  }

  if (!Array.isArray(record['tradeCategories']) || !Array.isArray(record['documents'])) {
    return false;
  }

  return true;
}

export async function fetchVerificationStatus(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchVerificationStatusResult> {
  const request = createGetMyVerificationStatusRequest(sessionToken);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { errorMessage: `Fetch verification status failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as unknown;

    // Server returns { status: 'not-submitted' } when no record exists
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'status' in payload &&
      (payload as Record<string, unknown>)['status'] === 'not-submitted'
    ) {
      return { verification: null };
    }

    if (!isVerificationRecord(payload)) {
      return { errorMessage: 'Invalid verification record format.' };
    }

    return { verification: payload };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown error fetching verification status.',
    };
  }
}

type SubmitVerificationResult =
  | { verification: VerificationRecord; errorMessage?: undefined }
  | { verification?: undefined; errorMessage: string };

export async function submitVerificationRequest(
  sessionToken: string,
  formData: OnboardingFormData,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitVerificationResult> {
  const request = createSubmitVerificationRequest(sessionToken, {
    businessName: formData.businessName,
    tradeCategories: formData.tradeCategories,
    serviceArea: formData.serviceArea,
    documents: formData.documents,
  });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { ...request.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const message = typeof errorBody['message'] === 'string' ? errorBody['message'] : `Submit failed with HTTP ${response.status}.`;
      return { errorMessage: message };
    }

    const payload = (await response.json()) as unknown;

    if (!isVerificationRecord(payload)) {
      return { errorMessage: 'Invalid verification record format.' };
    }

    return { verification: payload };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown error submitting verification.',
    };
  }
}

export async function loadOnboardingStatus(
  sessionToken: string,
  fetchImpl?: typeof fetch,
): Promise<ProviderOnboardingState> {
  const result = await fetchVerificationStatus(sessionToken, fetchImpl);

  if (result.errorMessage) {
    return createErrorState(result.errorMessage);
  }

  return resolveVerificationStateFromRecord(result.verification ?? null);
}

export async function submitOnboarding(
  sessionToken: string,
  formData: OnboardingFormData,
  fetchImpl?: typeof fetch,
): Promise<ProviderOnboardingState> {
  const result = await submitVerificationRequest(sessionToken, formData, fetchImpl);

  if (result.errorMessage) {
    return createErrorState(result.errorMessage);
  }

  return resolveVerificationStateFromRecord(result.verification ?? null);
}

export { createCheckingState };
