import { describe, expect, it } from 'vitest';

import {
  createErrorDetailState,
  createIdleDetailState,
  createLoadedDetailState,
  createLoadingDetailState,
  createNotFoundDetailState,
} from './provider-detail-state';

describe('provider-detail-state factories', () => {
  it('createIdleDetailState returns idle status', () => {
    const state = createIdleDetailState();
    expect(state.status).toBe('idle');
  });

  it('createLoadingDetailState returns loading with providerUserId', () => {
    const state = createLoadingDetailState('prov-1');
    expect(state.status).toBe('loading');
    if (state.status !== 'loading') return;
    expect(state.providerUserId).toBe('prov-1');
  });

  it('createLoadedDetailState returns loaded with provider data', () => {
    const provider = {
      providerUserId: 'prov-1',
      displayName: 'Alice',
      tradeCategories: ['plumbing'],
    };
    const state = createLoadedDetailState(provider);
    expect(state.status).toBe('loaded');
    if (state.status !== 'loaded') return;
    expect(state.provider.providerUserId).toBe('prov-1');
    expect(state.provider.displayName).toBe('Alice');
  });

  it('createNotFoundDetailState returns not-found with providerUserId', () => {
    const state = createNotFoundDetailState('prov-99');
    expect(state.status).toBe('not-found');
    if (state.status !== 'not-found') return;
    expect(state.providerUserId).toBe('prov-99');
  });

  it('createErrorDetailState returns error with message and providerUserId', () => {
    const state = createErrorDetailState('Network error', 'prov-1');
    expect(state.status).toBe('error');
    if (state.status !== 'error') return;
    expect(state.errorMessage).toBe('Network error');
    expect(state.providerUserId).toBe('prov-1');
  });
});
