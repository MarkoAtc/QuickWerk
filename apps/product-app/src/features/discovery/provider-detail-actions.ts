/**
 * Actions for the provider detail screen.
 *
 * Since the public API does not yet expose a dedicated single-provider endpoint,
 * we fetch the full list (optionally pre-filtered to be lighter) and pick by
 * providerUserId. This keeps the backend unchanged for Slice 3.
 */

import { loadPublicProviders } from './provider-discovery-actions';
import type { PublicProviderSummary } from './provider-discovery-state';

export type LoadProviderDetailResult =
  | { provider: PublicProviderSummary; errorMessage?: undefined }
  | { provider?: undefined; errorMessage: string }
  | { provider?: undefined; errorMessage?: undefined; notFound: true };

/**
 * Loads a single public provider profile by providerUserId.
 * Fetches the full public list and picks by id — no backend change required.
 */
export async function loadProviderDetail(
  providerUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadProviderDetailResult> {
  const trimmedProviderUserId = providerUserId?.trim();

  if (!trimmedProviderUserId) {
    return { errorMessage: 'providerUserId is required.' };
  }

  const result = await loadPublicProviders(undefined, fetchImpl);

  if (result.errorMessage) {
    return { errorMessage: result.errorMessage };
  }

  const provider = result.providers!.find((p) => p.providerUserId === trimmedProviderUserId);

  if (!provider) {
    return { notFound: true };
  }

  return { provider };
}
