import { describe, expect, it } from 'vitest';

import {
  createErrorDiscoveryState,
  createIdleDiscoveryState,
  createLoadedDiscoveryState,
  createLoadingDiscoveryState,
} from './provider-discovery-state';

describe('provider-discovery-state factories', () => {
  it('createIdleDiscoveryState returns idle status', () => {
    const state = createIdleDiscoveryState();
    expect(state.status).toBe('idle');
  });

  it('createLoadingDiscoveryState returns loading status without filter', () => {
    const state = createLoadingDiscoveryState();
    expect(state.status).toBe('loading');
    expect((state as { tradeCategory?: string }).tradeCategory).toBeUndefined();
  });

  it('createLoadingDiscoveryState captures tradeCategory filter', () => {
    const state = createLoadingDiscoveryState('plumbing');
    expect(state.status).toBe('loading');
    expect((state as { tradeCategory?: string }).tradeCategory).toBe('plumbing');
  });

  it('createLoadedDiscoveryState returns loaded status with providers', () => {
    const providers = [
      { providerUserId: 'prov-1', displayName: 'Alice', tradeCategories: ['plumbing'] },
    ];
    const state = createLoadedDiscoveryState(providers);
    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.providers).toHaveLength(1);
    expect(state.providers[0]?.displayName).toBe('Alice');
    expect(state.tradeCategory).toBeUndefined();
  });

  it('createLoadedDiscoveryState preserves tradeCategory filter on loaded state', () => {
    const state = createLoadedDiscoveryState([], 'electrical');
    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.tradeCategory).toBe('electrical');
    expect(state.providers).toEqual([]);
  });

  it('createErrorDiscoveryState returns error status with message', () => {
    const state = createErrorDiscoveryState('Network timeout');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network timeout');
    expect(state.tradeCategory).toBeUndefined();
  });

  it('createErrorDiscoveryState preserves tradeCategory on error', () => {
    const state = createErrorDiscoveryState('Server error', 'roofing');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Server error');
    expect(state.tradeCategory).toBe('roofing');
  });
});
