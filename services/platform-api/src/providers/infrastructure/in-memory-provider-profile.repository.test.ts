import { describe, expect, it } from 'vitest';

import { InMemoryProviderProfileRepository } from './in-memory-provider-profile.repository';

const now = () => new Date().toISOString();

describe('InMemoryProviderProfileRepository', () => {
  it('upserts a new profile', async () => {
    const repo = new InMemoryProviderProfileRepository();

    const profile = await repo.upsertProfile({
      providerUserId: 'provider-1',
      displayName: 'Max Muster',
      bio: 'Expert plumber',
      tradeCategories: ['plumbing'],
      serviceArea: 'Vienna 1-10',
      isPublic: true,
      now: now(),
    });

    expect(profile.providerUserId).toBe('provider-1');
    expect(profile.displayName).toBe('Max Muster');
    expect(profile.bio).toBe('Expert plumber');
    expect(profile.tradeCategories).toEqual(['plumbing']);
    expect(profile.serviceArea).toBe('Vienna 1-10');
    expect(profile.isPublic).toBe(true);
    expect(profile.createdAt).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
  });

  it('updates an existing profile, preserving createdAt', async () => {
    const repo = new InMemoryProviderProfileRepository();
    const firstNow = '2026-01-01T10:00:00.000Z';
    const secondNow = '2026-01-02T12:00:00.000Z';

    const first = await repo.upsertProfile({
      providerUserId: 'provider-1',
      displayName: 'Hans',
      tradeCategories: ['electrical'],
      isPublic: false,
      now: firstNow,
    });

    const updated = await repo.upsertProfile({
      providerUserId: 'provider-1',
      displayName: 'Hans Updated',
      bio: 'New bio',
      now: secondNow,
    });

    expect(updated.displayName).toBe('Hans Updated');
    expect(updated.bio).toBe('New bio');
    expect(updated.tradeCategories).toEqual(['electrical']); // preserved from first upsert
    expect(updated.createdAt).toBe(firstNow); // must not change
    expect(updated.updatedAt).toBe(secondNow);
    expect(first.createdAt).toBe(firstNow);
  });

  it('getProfileByProviderId returns null when profile does not exist', async () => {
    const repo = new InMemoryProviderProfileRepository();
    const result = await repo.getProfileByProviderId('unknown-provider');
    expect(result).toBeNull();
  });

  it('getProfileByProviderId returns the profile after upsert', async () => {
    const repo = new InMemoryProviderProfileRepository();

    await repo.upsertProfile({
      providerUserId: 'provider-2',
      displayName: 'Anna',
      tradeCategories: ['cleaning'],
      isPublic: true,
      now: now(),
    });

    const found = await repo.getProfileByProviderId('provider-2');
    expect(found).not.toBeNull();
    expect(found?.displayName).toBe('Anna');
  });

  it('listPublicProfiles returns only public profiles', async () => {
    const repo = new InMemoryProviderProfileRepository();

    await repo.upsertProfile({
      providerUserId: 'public-provider',
      displayName: 'Public',
      tradeCategories: ['plumbing'],
      isPublic: true,
      now: now(),
    });

    await repo.upsertProfile({
      providerUserId: 'private-provider',
      displayName: 'Private',
      tradeCategories: ['plumbing'],
      isPublic: false,
      now: now(),
    });

    const profiles = await repo.listPublicProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.providerUserId).toBe('public-provider');
  });

  it('listPublicProfiles filters by trade category (case-insensitive)', async () => {
    const repo = new InMemoryProviderProfileRepository();

    await repo.upsertProfile({
      providerUserId: 'plumber-1',
      displayName: 'Plumber',
      tradeCategories: ['Plumbing'],
      isPublic: true,
      now: now(),
    });

    await repo.upsertProfile({
      providerUserId: 'electrician-1',
      displayName: 'Electrician',
      tradeCategories: ['electrical'],
      isPublic: true,
      now: now(),
    });

    const plumbers = await repo.listPublicProfiles({ tradeCategory: 'plumbing' });
    expect(plumbers).toHaveLength(1);
    expect(plumbers[0]?.providerUserId).toBe('plumber-1');
  });
});
