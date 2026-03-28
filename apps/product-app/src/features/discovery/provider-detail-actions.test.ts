/**
 * Tests for provider-detail-actions (Slice 4).
 *
 * loadProviderDetail now calls GET /api/v1/providers/:providerUserId directly
 * instead of fetching the full list and filtering client-side.
 */
import { describe, expect, it } from 'vitest';

import { loadProviderDetail } from './provider-detail-actions';

const makeProviderResponse = (provider: unknown) =>
  (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => provider,
    }) as Response) as typeof fetch;

const make404Response = () =>
  (async () =>
    ({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Provider not found.' }),
    }) as Response) as typeof fetch;

const makeErrorResponse = (status: number) =>
  (async () =>
    ({
      ok: false,
      status,
      json: async () => ({ message: 'Server error' }),
    }) as Response) as typeof fetch;

describe('loadProviderDetail', () => {
  it('returns provider when API responds with valid profile', async () => {
    const fetchMock = makeProviderResponse({
      providerUserId: 'prov-1',
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
      isPublic: true,
      createdAt: '2026-01-01T09:00:00.000Z',
      updatedAt: '2026-01-01T09:00:00.000Z',
    });

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toBeUndefined();
    expect(result.notFound).toBeUndefined();
    expect(result.provider).toMatchObject({
      providerUserId: 'prov-1',
      displayName: 'Alice the Plumber',
    });
  });

  it('returns notFound when API responds 404', async () => {
    const fetchMock = make404Response();

    const result = await loadProviderDetail('prov-nonexistent', fetchMock);

    expect(result.provider).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
    expect(result.notFound).toBe(true);
  });

  it('returns errorMessage on non-404 HTTP error', async () => {
    const fetchMock = makeErrorResponse(503);

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toMatch('503');
    expect(result.provider).toBeUndefined();
  });

  it('returns errorMessage when fetch throws', async () => {
    const fetchMock = (async () => {
      throw new Error('Connection refused');
    }) as typeof fetch;

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toBe('Connection refused');
    expect(result.provider).toBeUndefined();
  });

  it('returns errorMessage when providerUserId is empty string', async () => {
    const fetchMock = makeProviderResponse([]);

    const result = await loadProviderDetail('', fetchMock);

    expect(result.errorMessage).toMatch(/required/i);
    expect(result.provider).toBeUndefined();
  });

  it('returns errorMessage when providerUserId is whitespace only', async () => {
    const fetchMock = makeProviderResponse([]);

    const result = await loadProviderDetail('   ', fetchMock);

    expect(result.errorMessage).toMatch(/required/i);
    expect(result.provider).toBeUndefined();
  });

  it('returns errorMessage when response JSON is missing required fields', async () => {
    const fetchMock = makeProviderResponse({ unexpected: true });

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.provider).toBeUndefined();
    expect(result.errorMessage).toBeTruthy();
  });

  it('calls the dedicated single-provider endpoint, not the list endpoint', async () => {
    const capturedUrls: string[] = [];
    const fetchMock = (async (input: RequestInfo | URL) => {
      capturedUrls.push(typeof input === 'string' ? input : String(input));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          providerUserId: 'prov-1',
          displayName: 'Alice',
          tradeCategories: [],
          isPublic: true,
          createdAt: '2026-01-01T09:00:00.000Z',
          updatedAt: '2026-01-01T09:00:00.000Z',
        }),
      } as Response;
    }) as typeof fetch;

    await loadProviderDetail('prov-1', fetchMock);

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toMatch('/api/v1/providers/prov-1');
    // Must NOT be the list endpoint
    expect(capturedUrls[0]).not.toBe('/api/v1/providers');
  });
});
