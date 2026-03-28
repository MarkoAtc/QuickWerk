/**
 * State types for the provider detail screen.
 *
 * The screen can be reached with a pre-loaded summary from the list (fast path),
 * or it can fetch the public provider by ID via the discovery list endpoint (fallback).
 * We re-use PublicProviderSummary as the detail model since the public API
 * does not yet expose a single-provider endpoint; the detail screen fetches the
 * full list and picks by providerUserId.
 */

import type { PublicProviderSummary } from './provider-discovery-state';

export type ProviderDetailState =
  | { status: 'idle' }
  | { status: 'loading'; providerUserId: string }
  | { status: 'loaded'; provider: PublicProviderSummary }
  | { status: 'not-found'; providerUserId: string }
  | { status: 'error'; errorMessage: string; providerUserId: string };

export const createIdleDetailState = (): ProviderDetailState => ({ status: 'idle' });

export const createLoadingDetailState = (providerUserId: string): ProviderDetailState => ({
  status: 'loading',
  providerUserId,
});

export const createLoadedDetailState = (provider: PublicProviderSummary): ProviderDetailState => ({
  status: 'loaded',
  provider,
});

export const createNotFoundDetailState = (providerUserId: string): ProviderDetailState => ({
  status: 'not-found',
  providerUserId,
});

export const createErrorDetailState = (
  errorMessage: string,
  providerUserId: string,
): ProviderDetailState => ({
  status: 'error',
  errorMessage,
  providerUserId,
});
