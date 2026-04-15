import { describe, expect, it } from 'vitest';

import { loadPublicProviders } from './provider-discovery-actions';

describe('loadPublicProviders', () => {
  it('returns a list of providers on successful response', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [
          {
            providerUserId: 'prov-1',
            displayName: 'Alice the Plumber',
            bio: 'Expert plumbing services',
            tradeCategories: ['plumbing'],
            serviceArea: 'Vienna',
            isPublic: true,
            createdAt: '2026-01-01T09:00:00.000Z',
            updatedAt: '2026-01-02T09:00:00.000Z',
          },
          {
            providerUserId: 'prov-2',
            displayName: 'Bob the Electrician',
            tradeCategories: ['electrical'],
            isPublic: true,
            createdAt: '2026-01-01T09:00:00.000Z',
            updatedAt: '2026-01-01T09:00:00.000Z',
          },
        ],
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.providers).toHaveLength(2);
    expect(result.providers?.[0]).toMatchObject({
      providerUserId: 'prov-1',
      displayName: 'Alice the Plumber',
      bio: 'Expert plumbing services',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
    });
    expect(result.providers?.[1]).toMatchObject({
      providerUserId: 'prov-2',
      displayName: 'Bob the Electrician',
    });
  });

  it('returns an empty array when no public providers exist', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [],
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.providers).toEqual([]);
  });

  it('returns error when the request fails with non-OK HTTP status', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 503,
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toMatch('503');
    expect(result.providers).toBeUndefined();
  });

  it('returns error when response is not an array', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ error: 'unexpected shape' }),
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toMatch(/not an array/);
    expect(result.providers).toBeUndefined();
  });

  it('returns error when fetch throws', async () => {
    const fetchMock = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3101');
    };

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toBe('connect ECONNREFUSED 127.0.0.1:3101');
    expect(result.providers).toBeUndefined();
  });

  it('passes tradeCategory filter as query param (verified via URL shape from request builder)', async () => {
    let capturedUrl: string | undefined;

    const fetchMock = async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : String(url);
      return {
        ok: true,
        json: async () => [],
      } as Response;
    };

    await loadPublicProviders({ tradeCategory: 'plumbing' }, fetchMock as unknown as typeof fetch);

    expect(capturedUrl).toContain('tradeCategory=plumbing');
  });

  it('passes combined tradeCategory + location filters as query params', async () => {
    let capturedUrl: string | undefined;

    const fetchMock = async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : String(url);
      return {
        ok: true,
        json: async () => [],
      } as Response;
    };

    await loadPublicProviders(
      { tradeCategory: 'plumbing', location: '  Vienna 10 ' },
      fetchMock as unknown as typeof fetch,
    );

    expect(capturedUrl).toContain('tradeCategory=plumbing');
    expect(capturedUrl).toContain('location=Vienna+10');
  });

  it('omits tradeCategory query param when filter is not provided', async () => {
    let capturedUrl: string | undefined;

    const fetchMock = async (url: string | URL | Request) => {
      capturedUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : String(url);
      return {
        ok: true,
        json: async () => [],
      } as Response;
    };

    await loadPublicProviders(undefined, fetchMock as unknown as typeof fetch);

    expect(capturedUrl).not.toContain('tradeCategory');
  });

  it('sanitizes items with missing required fields from the response array', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [
          {
            providerUserId: 'prov-1',
            displayName: 'Alice the Plumber',
            tradeCategories: ['plumbing'],
            isPublic: true,
            createdAt: '2026-01-01T09:00:00.000Z',
            updatedAt: '2026-01-01T09:00:00.000Z',
          },
          // Missing providerUserId — should be dropped
          {
            displayName: 'Broken entry',
            tradeCategories: ['roofing'],
            isPublic: true,
          },
          // Missing displayName — should be dropped
          {
            providerUserId: 'prov-3',
            tradeCategories: ['carpentry'],
            isPublic: true,
          },
        ],
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.errorMessage).toBeUndefined();
    expect(result.providers).toHaveLength(1);
    expect(result.providers?.[0]?.providerUserId).toBe('prov-1');
  });

  it('filters out non-string tradeCategory entries from raw payload', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => [
          {
            providerUserId: 'prov-1',
            displayName: 'Mixed Cat Provider',
            tradeCategories: ['plumbing', 99, null, 'electrical'],
            isPublic: true,
            createdAt: '2026-01-01T09:00:00.000Z',
            updatedAt: '2026-01-01T09:00:00.000Z',
          },
        ],
      }) as Response;

    const result = await loadPublicProviders(undefined, fetchMock as typeof fetch);

    expect(result.providers?.[0]?.tradeCategories).toEqual(['plumbing', 'electrical']);
  });
});
