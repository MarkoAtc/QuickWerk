import { describe, expect, it } from 'vitest';

import { loadMyProviderProfile, saveMyProviderProfile } from './provider-screen-actions';

const mockFetch =
  (status: number, body: unknown): typeof fetch =>
  () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as Response);

const sampleProfile = {
  providerUserId: 'provider-1',
  displayName: 'Max Muster',
  bio: 'Expert plumber',
  tradeCategories: ['plumbing'],
  serviceArea: 'Vienna',
  isPublic: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T12:00:00.000Z',
};

describe('loadMyProviderProfile', () => {
  it('returns profile on success', async () => {
    const fetch = mockFetch(200, sampleProfile);

    const result = await loadMyProviderProfile('provider-token', fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.profile?.displayName).toBe('Max Muster');
    expect(result.profile?.tradeCategories).toEqual(['plumbing']);
    expect(result.profile?.isPublic).toBe(true);
  });

  it('returns null profile when API returns not-set status', async () => {
    const fetch = mockFetch(200, { status: 'not-set' });

    const result = await loadMyProviderProfile('provider-token', fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.profile).toBeNull();
  });

  it('returns null profile on 404', async () => {
    const fetch = mockFetch(404, { message: 'Not found' });

    const result = await loadMyProviderProfile('provider-token', fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.profile).toBeNull();
  });

  it('returns errorMessage on HTTP error', async () => {
    const fetch = mockFetch(403, { message: 'Forbidden' });

    const result = await loadMyProviderProfile('provider-token', fetch);

    expect(result.profile).toBeUndefined();
    expect(result.errorMessage).toContain('403');
  });

  it('returns errorMessage on network error', async () => {
    const fetch = () => Promise.reject(new Error('Offline'));

    const result = await loadMyProviderProfile(
      'provider-token',
      fetch as unknown as typeof globalThis.fetch,
    );

    expect(result.errorMessage).toContain('Offline');
  });
});

describe('saveMyProviderProfile', () => {
  it('returns saved profile on success', async () => {
    const fetch = mockFetch(200, sampleProfile);

    const result = await saveMyProviderProfile(
      'provider-token',
      { displayName: 'Max Muster', isPublic: true },
      fetch,
    );

    expect(result.errorMessage).toBeUndefined();
    expect(result.profile?.displayName).toBe('Max Muster');
    expect(result.profile?.isPublic).toBe(true);
  });

  it('returns errorMessage on HTTP 400', async () => {
    const fetch = mockFetch(400, { message: 'displayName required' });

    const result = await saveMyProviderProfile(
      'provider-token',
      { displayName: '' },
      fetch,
    );

    expect(result.profile).toBeUndefined();
    expect(result.errorMessage).toContain('400');
  });

  it('returns errorMessage when response missing required fields', async () => {
    const fetch = mockFetch(200, { unexpected: true });

    const result = await saveMyProviderProfile(
      'provider-token',
      { displayName: 'Valid' },
      fetch,
    );

    expect(result.profile).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });
});
