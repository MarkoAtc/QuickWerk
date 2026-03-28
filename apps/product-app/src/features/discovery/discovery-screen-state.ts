/**
 * Screen-level state for the customer discovery screen.
 *
 * Composes the provider-discovery async state with a controlled filter input,
 * so screen logic and tests can work with a single coherent state shape.
 */

import {
  createIdleDiscoveryState,
  createLoadedDiscoveryState,
  createLoadingDiscoveryState,
  createErrorDiscoveryState,
  ProviderDiscoveryState,
  PublicProviderSummary,
} from './provider-discovery-state';

export type DiscoveryScreenState = {
  /** Async fetch state: idle | loading | loaded | error */
  discoveryState: ProviderDiscoveryState;
  /** Current value of the trade-category filter input (controlled) */
  filterInput: string;
};

// --- Factories ---

export const createInitialDiscoveryScreenState = (): DiscoveryScreenState => ({
  discoveryState: createIdleDiscoveryState(),
  filterInput: '',
});

export const applyFilterInputChange = (
  state: DiscoveryScreenState,
  filterInput: string,
): DiscoveryScreenState => ({
  ...state,
  filterInput,
});

export const applyDiscoveryLoading = (
  state: DiscoveryScreenState,
  tradeCategory?: string,
): DiscoveryScreenState => ({
  ...state,
  discoveryState: createLoadingDiscoveryState(tradeCategory || undefined),
});

export const applyDiscoveryLoaded = (
  state: DiscoveryScreenState,
  providers: PublicProviderSummary[],
  tradeCategory?: string,
): DiscoveryScreenState => ({
  ...state,
  discoveryState: createLoadedDiscoveryState(providers, tradeCategory || undefined),
});

export const applyDiscoveryError = (
  state: DiscoveryScreenState,
  errorMessage: string,
  tradeCategory?: string,
): DiscoveryScreenState => ({
  ...state,
  discoveryState: createErrorDiscoveryState(errorMessage, tradeCategory || undefined),
});

/**
 * Returns the effective filter value to use when fetching:
 * trims whitespace and returns undefined if empty.
 */
export const resolveActiveFilter = (
  state: DiscoveryScreenState,
): string | undefined => {
  const trimmed = state.filterInput.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
