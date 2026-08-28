import { describe, expect, it } from 'vitest';

import {
  formatProviderRequestTimestamp,
  getProviderDisplayName,
  getProviderInitial,
  getProviderProfileLabel,
} from './provider-dashboard-presenter';

describe('provider dashboard presenter', () => {
  it('uses real provider identity with neutral fallbacks', () => {
    expect(getProviderDisplayName({ displayName: '  Marcus Weber  ' })).toBe('Marcus Weber');
    expect(getProviderDisplayName(null)).toBe('Provider');
    expect(getProviderInitial({ displayName: 'Marcus Weber' })).toBe('M');
    expect(getProviderInitial(null)).toBe('P');
  });

  it('describes profile readiness without inventing quality metrics', () => {
    expect(getProviderProfileLabel({ displayName: 'Marcus Weber' })).toBe('Ready');
    expect(getProviderProfileLabel(null)).toBe('Set up');
  });

  it('formats valid request timestamps deterministically and falls back safely', () => {
    expect(formatProviderRequestTimestamp('2026-03-20T10:15:00.000Z')).toBe('Mar 20, 10:15 UTC');
    expect(formatProviderRequestTimestamp('not-a-date')).toBe('Recently submitted');
  });
});
