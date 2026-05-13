/**
 * Tests for ProvidersService.getPublicProviderById (Slice 4).
 *
 * Covers: found, not-found, private profile → 404, empty/whitespace id → 404.
 */
import { describe, expect, it } from 'vitest';

import { InMemoryProviderProfileRepository } from './infrastructure/in-memory-provider-profile.repository';
import { InMemoryProviderVerificationRepository } from './infrastructure/in-memory-provider-verification.repository';
import { InMemoryUploadUrlRepository } from './infrastructure/in-memory-upload-url.repository';
import { ProvidersService } from './providers.service';

const createService = () =>
  new ProvidersService(
    new InMemoryProviderVerificationRepository(),
    new InMemoryProviderProfileRepository(),
    new InMemoryUploadUrlRepository(),
  );

const makeProviderSession = (userId: string) => ({
  createdAt: '2026-01-01T09:00:00.000Z',
  expiresAt: '2026-01-02T09:00:00.000Z',
  email: `${userId}@example.com`,
  role: 'provider' as const,
  token: `token-${userId}`,
  userId,
});

describe('ProvidersService.getPublicProviderById', () => {
  it('returns the provider when found and public', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice the Plumber',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
      bio: 'Fast and reliable.',
      isPublic: true,
    });
    await approveProvider(service, 'prov-1');

    const result = await service.getPublicProviderById('prov-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider.providerUserId).toBe('prov-1');
    expect(result.provider.displayName).toBe('Alice the Plumber');
    expect(result.provider.isPublic).toBe(true);
    expect(result.provider.tradeCategories).toEqual(['plumbing']);
    expect(result.provider.serviceArea).toBe('Vienna');
    expect(result.provider.bio).toBe('Fast and reliable.');
    expect(typeof result.provider.createdAt).toBe('string');
    expect(typeof result.provider.updatedAt).toBe('string');
  });

  it('returns 404 when provider does not exist', async () => {
    const service = createService();

    const result = await service.getPublicProviderById('prov-nonexistent');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
    expect(result.error).toMatch(/not found/i);
  });

  it('returns 404 when provider exists but profile is not public', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-private'), {
      displayName: 'Bob Private',
      tradeCategories: ['electrical'],
      isPublic: false,
    });

    const result = await service.getPublicProviderById('prov-private');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 when provider is public but not approved', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-pending'), {
      displayName: 'Pending Public Provider',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });

    const result = await service.getPublicProviderById('prov-pending');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 for empty string id', async () => {
    const service = createService();

    const result = await service.getPublicProviderById('');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 for whitespace-only id', async () => {
    const service = createService();

    const result = await service.getPublicProviderById('   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.statusCode).toBe(404);
  });

  it('returns only the requested provider, not others', async () => {
    const service = createService();

    await service.upsertProfile(makeProviderSession('prov-1'), {
      displayName: 'Alice',
      tradeCategories: ['plumbing'],
      isPublic: true,
    });
    await approveProvider(service, 'prov-1');

    await service.upsertProfile(makeProviderSession('prov-2'), {
      displayName: 'Bob',
      tradeCategories: ['electrical'],
      isPublic: true,
    });
    await approveProvider(service, 'prov-2');

    const result = await service.getPublicProviderById('prov-2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider.providerUserId).toBe('prov-2');
    expect(result.provider.displayName).toBe('Bob');
  });
});

const makeOperatorSession = (userId: string) => ({
  createdAt: '2026-01-01T09:00:00.000Z',
  expiresAt: '2026-01-02T09:00:00.000Z',
  email: `${userId}@example.com`,
  role: 'operator' as const,
  token: `token-${userId}`,
  userId,
});

async function approveProvider(service: ProvidersService, providerUserId: string) {
  const submitted = await service.submitVerification(makeProviderSession(providerUserId), {
    tradeCategories: ['plumbing'],
    documents: [{ filename: 'license.pdf', mimeType: 'application/pdf' }],
  });
  if (!submitted.ok) {
    throw new Error('verification submission failed');
  }

  const reviewed = await service.reviewVerification(
    makeOperatorSession('op-1'),
    submitted.verification.verificationId,
    { decision: 'approved' },
  );
  if (!reviewed.ok) {
    throw new Error('verification approval failed');
  }
}
