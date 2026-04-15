import { createListPublicProvidersRequest, PublicProviderProfile } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';
import { PublicProviderSummary } from './provider-discovery-state';

export type LoadProvidersResult =
  | { providers: PublicProviderSummary[]; errorMessage?: undefined }
  | { providers?: undefined; errorMessage: string };

/**
 * Parses a raw provider profile payload from the public discovery API response.
 * Returns null if required fields are missing or have invalid types.
 */
function parsePublicProviderSummary(raw: unknown): PublicProviderSummary | null {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;

  const providerUserId = typeof item['providerUserId'] === 'string' ? item['providerUserId'] : '';
  const displayName = typeof item['displayName'] === 'string' ? item['displayName'] : '';

  if (!providerUserId || !displayName) return null;

  return {
    providerUserId,
    displayName,
    bio: typeof item['bio'] === 'string' ? item['bio'] : undefined,
    tradeCategories: Array.isArray(item['tradeCategories'])
      ? (item['tradeCategories'] as unknown[]).filter((c): c is string => typeof c === 'string')
      : [],
    serviceArea: typeof item['serviceArea'] === 'string' ? item['serviceArea'] : undefined,
  };
}

/**
 * Loads public provider profiles for customer discovery.
 * Optionally filtered by trade category.
 * This is a public route — no session token required.
 */
export async function loadPublicProviders(
  filter?: { tradeCategory?: string; location?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<LoadProvidersResult> {
  const request = createListPublicProvidersRequest(filter);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
    });

    if (!response.ok) {
      return { errorMessage: `Load providers failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      return { errorMessage: 'Provider discovery response was not an array.' };
    }

    const providers = payload
      .map((item) => parsePublicProviderSummary(item))
      .filter((p): p is PublicProviderSummary => p !== null);

    return { providers };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown provider discovery failure.',
    };
  }
}

// Re-export the API type for consumers that need the full profile shape
export type { PublicProviderProfile };
