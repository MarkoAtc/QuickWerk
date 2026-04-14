/**
 * Actions for the provider detail screen.
 *
 * Slice 4: uses the dedicated `GET /api/v1/providers/:providerUserId` endpoint
 * added in platform-api instead of fetching the full list and filtering client-side.
 */

import { createGetPublicProviderRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';
import type { PublicProviderSummary } from './provider-discovery-state';

export type LoadProviderDetailResult =
  | { provider: PublicProviderSummary; errorMessage?: undefined; notFound?: undefined }
  | { provider?: undefined; errorMessage: string; notFound?: undefined }
  | { provider?: undefined; errorMessage?: undefined; notFound: true };

/**
 * Loads a single public provider profile by providerUserId via the dedicated
 * `GET /api/v1/providers/:providerUserId` endpoint.
 *
 * Returns notFound when the API responds with 404, and errorMessage for other failures.
 */
export async function loadProviderDetail(
  providerUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadProviderDetailResult> {
  const trimmedProviderUserId = providerUserId?.trim();

  if (!trimmedProviderUserId) {
    return { errorMessage: 'providerUserId is required.' };
  }

  const request = createGetPublicProviderRequest(trimmedProviderUserId);

  let response: Response;
  try {
    response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, { method: request.method });
  } catch (err) {
    return { errorMessage: err instanceof Error ? err.message : 'Unexpected error loading provider.' };
  }

  if (response.status === 404) {
    return { notFound: true };
  }

  if (!response.ok) {
    return { errorMessage: `Request failed with status ${response.status}.` };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { errorMessage: 'Invalid JSON response from server.' };
  }

  if (!isPublicProviderSummary(data)) {
    return { errorMessage: 'Invalid provider profile data received.' };
  }

  return { provider: data };
}

function isPublicProviderSummary(value: unknown): value is PublicProviderSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.providerUserId === 'string' &&
    typeof record.displayName === 'string' &&
    Array.isArray(record.tradeCategories) &&
    typeof record.isPublic === 'boolean' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}
