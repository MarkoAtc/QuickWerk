import { describe, expect, it } from 'vitest';

import {
  applyDiscoveryError,
  applyDiscoveryLoaded,
  applyDiscoveryLoading,
  applyFilterInputChange,
  createInitialDiscoveryScreenState,
  resolveActiveFilter,
} from './discovery-screen-state';

describe('discovery-screen-state factories', () => {
  it('createInitialDiscoveryScreenState returns idle discovery + empty filter', () => {
    const state = createInitialDiscoveryScreenState();
    expect(state.discoveryState.status).toBe('idle');
    expect(state.filterInput).toBe('');
  });

  it('applyFilterInputChange updates filterInput and preserves discoveryState', () => {
    const initial = createInitialDiscoveryScreenState();
    const next = applyFilterInputChange(initial, 'plumbing');
    expect(next.filterInput).toBe('plumbing');
    expect(next.discoveryState.status).toBe('idle');
  });

  it('applyDiscoveryLoading transitions to loading with tradeCategory', () => {
    const initial = createInitialDiscoveryScreenState();
    const next = applyDiscoveryLoading(initial, 'electrical');
    expect(next.discoveryState.status).toBe('loading');
    if (next.discoveryState.status !== 'loading') return;
    expect(next.discoveryState.tradeCategory).toBe('electrical');
  });

  it('applyDiscoveryLoading transitions to loading without tradeCategory when empty string passed', () => {
    const initial = createInitialDiscoveryScreenState();
    const next = applyDiscoveryLoading(initial, '');
    expect(next.discoveryState.status).toBe('loading');
    if (next.discoveryState.status !== 'loading') return;
    expect(next.discoveryState.tradeCategory).toBeUndefined();
  });

  it('applyDiscoveryLoaded transitions to loaded with providers', () => {
    const initial = createInitialDiscoveryScreenState();
    const providers = [
      { providerUserId: 'p1', displayName: 'Alice', tradeCategories: ['plumbing'] },
    ];
    const next = applyDiscoveryLoaded(initial, providers, 'plumbing');
    expect(next.discoveryState.status).toBe('loaded');
    if (next.discoveryState.status !== 'loaded') return;
    expect(next.discoveryState.providers).toHaveLength(1);
    expect(next.discoveryState.tradeCategory).toBe('plumbing');
  });

  it('applyDiscoveryError transitions to error with message', () => {
    const initial = createInitialDiscoveryScreenState();
    const next = applyDiscoveryError(initial, 'Network failed', 'roofing');
    expect(next.discoveryState.status).toBe('error');
    if (next.discoveryState.status !== 'error') return;
    expect(next.discoveryState.errorMessage).toBe('Network failed');
    expect(next.discoveryState.tradeCategory).toBe('roofing');
  });

  it('applyDiscoveryError with empty tradeCategory stores undefined', () => {
    const initial = createInitialDiscoveryScreenState();
    const next = applyDiscoveryError(initial, 'Timeout', '');
    expect(next.discoveryState.status).toBe('error');
    if (next.discoveryState.status !== 'error') return;
    expect(next.discoveryState.tradeCategory).toBeUndefined();
  });
});

describe('resolveActiveFilter', () => {
  it('returns undefined when filterInput is empty', () => {
    const state = createInitialDiscoveryScreenState();
    expect(resolveActiveFilter(state)).toBeUndefined();
  });

  it('returns undefined when filterInput is whitespace only', () => {
    const state = applyFilterInputChange(createInitialDiscoveryScreenState(), '   ');
    expect(resolveActiveFilter(state)).toBeUndefined();
  });

  it('returns trimmed value when filterInput has content', () => {
    const state = applyFilterInputChange(createInitialDiscoveryScreenState(), '  plumbing  ');
    expect(resolveActiveFilter(state)).toBe('plumbing');
  });

  it('preserves single-word filter as-is', () => {
    const state = applyFilterInputChange(createInitialDiscoveryScreenState(), 'electrical');
    expect(resolveActiveFilter(state)).toBe('electrical');
  });
});
