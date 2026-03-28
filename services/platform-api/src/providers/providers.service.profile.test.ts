import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryProviderProfileRepository } from './infrastructure/in-memory-provider-profile.repository';
import { InMemoryProviderVerificationRepository } from './infrastructure/in-memory-provider-verification.repository';
import { ProvidersService } from './providers.service';

const createSession = (role: AuthSession['role'], userId: string): AuthSession => {
  const createdAt = new Date();
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 3600 * 1000).toISOString(),
    email: `${role}@quickwerk.local`,
    role,
    token: `${role}-token`,
    userId,
  };
};

const createService = () =>
  new ProvidersService(new InMemoryProviderVerificationRepository(), new InMemoryProviderProfileRepository());

describe('ProvidersService — profile', () => {
  it('provider can upsert their profile', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    const result = await service.upsertProfile(provider, {
      displayName: 'Max Muster',
      bio: 'Experienced plumber',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna',
      isPublic: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.displayName).toBe('Max Muster');
    expect(result.profile.isPublic).toBe(true);
    expect(result.profile.tradeCategories).toEqual(['plumbing']);
  });

  it('customer cannot upsert a provider profile', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const result = await service.upsertProfile(customer, { displayName: 'Hacker' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });

  it('upsert requires displayName', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    const result = await service.upsertProfile(provider, { displayName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(400);
    }
  });

  it('provider can get their own profile', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    await service.upsertProfile(provider, { displayName: 'Hans' });

    const result = await service.getMyProfile(provider);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile?.displayName).toBe('Hans');
  });

  it('getMyProfile returns null profile when not set', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-2');

    const result = await service.getMyProfile(provider);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toBeNull();
  });

  it('customer cannot get their own provider profile', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const result = await service.getMyProfile(customer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });

  it('upsert is idempotent and merges partial updates', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    await service.upsertProfile(provider, {
      displayName: 'Hans',
      tradeCategories: ['plumbing'],
      isPublic: false,
    });

    const updated = await service.upsertProfile(provider, {
      displayName: 'Hans Updated',
      bio: 'New bio added',
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.profile.displayName).toBe('Hans Updated');
    expect(updated.profile.bio).toBe('New bio added');
    // tradeCategories preserved from first upsert
    expect(updated.profile.tradeCategories).toEqual(['plumbing']);
  });
});
