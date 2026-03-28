/**
 * Customer-facing provider discovery state.
 *
 * Manages the lifecycle of fetching public provider profiles for the discovery
 * experience: idle → loading → loaded (with optional trade category filter) or error.
 */

export type PublicProviderSummary = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories: string[];
  serviceArea?: string;
};

export type ProviderDiscoveryState =
  | { status: 'idle' }
  | { status: 'loading'; tradeCategory?: string }
  | {
      status: 'loaded';
      providers: PublicProviderSummary[];
      tradeCategory?: string;
    }
  | { status: 'error'; errorMessage: string; tradeCategory?: string };

export const createIdleDiscoveryState = (): ProviderDiscoveryState => ({ status: 'idle' });

export const createLoadingDiscoveryState = (tradeCategory?: string): ProviderDiscoveryState => ({
  status: 'loading',
  tradeCategory,
});

export const createLoadedDiscoveryState = (
  providers: PublicProviderSummary[],
  tradeCategory?: string,
): ProviderDiscoveryState => ({
  status: 'loaded',
  providers,
  tradeCategory,
});

export const createErrorDiscoveryState = (
  errorMessage: string,
  tradeCategory?: string,
): ProviderDiscoveryState => ({
  status: 'error',
  errorMessage,
  tradeCategory,
});
