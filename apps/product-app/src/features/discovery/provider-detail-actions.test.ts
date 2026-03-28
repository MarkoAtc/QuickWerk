import { describe, expect, it } from 'vitest';

import { loadProviderDetail } from './provider-detail-actions';

const makeListResponse = (providers: unknown[]) =>
  (async () =>
    ({
      ok: true,
      json: async () => providers,
    }) as Response) as typeof fetch;

describe('loadProviderDetail', () => {
  it('returns provider when found in list', async () => {
    const fetchMock = makeListResponse([
      {
        providerUserId: 'prov-1',
        displayName: 'Alice the Plumber',
        tradeCategories: ['plumbing'],
        serviceArea: 'Vienna',
        isPublic: true,
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-01-01T09:00:00.000Z',
      },
      {
        providerUserId: 'prov-2',
        displayName: 'Bob the Electrician',
        tradeCategories: ['electrical'],
        isPublic: true,
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-01-01T09:00:00.000Z',
      },
    ]);

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toBeUndefined();
    expect((result as { notFound?: boolean }).notFound).toBeUndefined();
    expect(result.provider).toMatchObject({
      providerUserId: 'prov-1',
      displayName: 'Alice the Plumber',
    });
  });

  it('returns notFound when providerUserId is not in list', async () => {
    const fetchMock = makeListResponse([
      {
        providerUserId: 'prov-2',
        displayName: 'Bob the Electrician',
        tradeCategories: ['electrical'],
        isPublic: true,
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-01-01T09:00:00.000Z',
      },
    ]);

    const result = await loadProviderDetail('prov-999', fetchMock);

    expect(result.provider).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
    expect((result as { notFound?: boolean }).notFound).toBe(true);
  });

  it('returns error when list fetch fails', async () => {
    const fetchMock = (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch;

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toMatch('503');
    expect(result.provider).toBeUndefined();
  });

  it('returns error when fetch throws', async () => {
    const fetchMock = (async () => {
      throw new Error('Connection refused');
    }) as typeof fetch;

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect(result.errorMessage).toBe('Connection refused');
    expect(result.provider).toBeUndefined();
  });

  it('returns error when providerUserId is empty string', async () => {
    const fetchMock = makeListResponse([]);

    const result = await loadProviderDetail('', fetchMock);

    expect(result.errorMessage).toMatch(/required/i);
    expect(result.provider).toBeUndefined();
  });

  it('returns notFound when list is empty', async () => {
    const fetchMock = makeListResponse([]);

    const result = await loadProviderDetail('prov-1', fetchMock);

    expect((result as { notFound?: boolean }).notFound).toBe(true);
    expect(result.provider).toBeUndefined();
  });

  it('returns second provider when first does not match', async () => {
    const fetchMock = makeListResponse([
      {
        providerUserId: 'prov-1',
        displayName: 'Alice',
        tradeCategories: ['plumbing'],
        isPublic: true,
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-01-01T09:00:00.000Z',
      },
      {
        providerUserId: 'prov-2',
        displayName: 'Bob',
        tradeCategories: ['electrical'],
        isPublic: true,
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-01-01T09:00:00.000Z',
      },
    ]);

    const result = await loadProviderDetail('prov-2', fetchMock);

    expect(result.provider?.displayName).toBe('Bob');
  });
});
