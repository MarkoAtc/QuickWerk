import { describe, expect, it } from 'vitest';

import { InMemoryProviderProfileRepository } from './infrastructure/in-memory-provider-profile.repository';
import { InMemoryProviderVerificationRepository } from './infrastructure/in-memory-provider-verification.repository';
import { ProvidersService } from './providers.service';

const createService = () =>
  new ProvidersService(new InMemoryProviderVerificationRepository(), new InMemoryProviderProfileRepository());

/**
 * Directly seeds profiles into the repository via the service's upsertProfile,
 * using a provider session for each.
 */
const makeProviderSession = (userId: string) => ({
  createdAt: '2026-01-01T09:00:00.000Z',
  expiresAt: '2026-01-02T09:00:00.000Z',
  email: `${userId}@example.com`,
  role: 'provider' as const,
  token: `token-${userId}`,
  userId,
});

describe('ProvidersService.listPublicProviders', () => {
  it('returns an empty array when no profiles exist', async () => {
    const service = createService();

    const result = await service.listPublicProviders();

    expect(result.ok).toBe(true);
    expect(result.providers).toEqual([]);
  });

  it('returns only public profiles', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });

    await service.upsertProfile(makeProviderSession('prov-2'), {
      displayName: 'Bob Private',
      tradeCategories: ['electrical'],
      isPublic: false,
    });

    const result = await service.listPublicProviders();

    expect(result.ok).toBe(true);
    expect(result.providers).toHaveLength(1);
    expect(result.providers[0]?.displayName).toBe('Alice the Plumber');
  });

  it('returns all public profiles when no filter is applied', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });

    await service.upsertProfile(makeProviderSession('prov-2'), {
      displayName: 'Charlie the Electrician',
      tradeCategories: ['electrical'],
      isPublic: true,
    });

    const result = await service.listPublicProviders();

    expect(result.ok).toBe(true);
    expect(result.providers).toHaveLength(2);
  });

  it('filters public profiles by trade category (case-insensitive)', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });

    await service.upsertProfile(makeProviderSession('prov-2'), {
      displayName: 'Charlie the Electrician',
      tradeCategories: ['electrical'],
      isPublic: true,
    });

    const result = await service.listPublicProviders({ tradeCategory: 'PLUMBING' });

    expect(result.ok).toBe(true);
    expect(result.providers).toHaveLength(1);
    expect(result.providers[0]?.displayName).toBe('Alice the Plumber');
  });

  it('returns empty array when filter matches no public profiles', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });

    const result = await service.listPublicProviders({ tradeCategory: 'carpentry' });

    expect(result.ok).toBe(true);
    expect(result.providers).toEqual([]);
  });

  it('does not return a private profile even if it matches the trade category filter', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Private Plumber',
      tradeCategories: ['plumbing'],
      isPublic: false,
    });

    const result = await service.listPublicProviders({ tradeCategory: 'plumbing' });

    expect(result.ok).toBe(true);
    expect(result.providers).toEqual([]);
  });

  it('serializes profile fields correctly for consumer use', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Diana the Carpenter',
      bio: 'Expert wood joinery',
      tradeCategories: ['carpentry', 'woodworking'],
      serviceArea: 'Graz',
      isPublic: true,
    });

    const result = await service.listPublicProviders();

    expect(result.ok).toBe(true);
    const p = result.providers[0];
    expect(p).toMatchObject({
      providerUserId: 'prov-1',
      displayName: 'Diana the Carpenter',
      bio: 'Expert wood joinery',
      tradeCategories: ['carpentry', 'woodworking'],
      serviceArea: 'Graz',
      isPublic: true,
    });
    expect(typeof p?.createdAt).toBe('string');
    expect(typeof p?.updatedAt).toBe('string');
  });
});
