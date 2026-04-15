import { Injectable } from '@nestjs/common';

import {
  ProviderProfile,
  ProviderProfileRepository,
  UpsertProviderProfileInput,
} from '../domain/provider-profile.repository';

@Injectable()
export class InMemoryProviderProfileRepository implements ProviderProfileRepository {
  private readonly profiles = new Map<string, ProviderProfile>();

  async upsertProfile(input: UpsertProviderProfileInput): Promise<ProviderProfile> {
    const existing = this.profiles.get(input.providerUserId);

    const updated: ProviderProfile = {
      providerUserId: input.providerUserId,
      displayName: input.displayName,
      bio: input.bio !== undefined ? (input.bio.trim() || undefined) : existing?.bio,
      tradeCategories: (input.tradeCategories ?? existing?.tradeCategories ?? [])
        .map((c) => c.trim())
        .filter(Boolean),
      serviceArea: input.serviceArea !== undefined ? (input.serviceArea.trim() || undefined) : existing?.serviceArea,
      isPublic: input.isPublic ?? existing?.isPublic ?? false,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
    };

    this.profiles.set(input.providerUserId, updated);
    return updated;
  }

  async getProfileByProviderId(providerUserId: string): Promise<ProviderProfile | null> {
    return this.profiles.get(providerUserId) ?? null;
  }

  async getPublicProfileByProviderId(providerUserId: string): Promise<ProviderProfile | null> {
    const profile = this.profiles.get(providerUserId);
    if (!profile || !profile.isPublic) {
      return null;
    }
    return profile;
  }

  async listPublicProfiles(filter?: { tradeCategory?: string; location?: string }): Promise<ProviderProfile[]> {
    let filtered = Array.from(this.profiles.values()).filter((p) => p.isPublic);

    const normalizedCategory = filter?.tradeCategory?.toLowerCase().trim();
    if (normalizedCategory) {
      filtered = filtered.filter((p) =>
        p.tradeCategories.some((c) => c.toLowerCase() === normalizedCategory),
      );
    }

    const normalizedLocation = filter?.location?.toLowerCase().trim();
    if (normalizedLocation) {
      filtered = filtered.filter((p) => p.serviceArea?.toLowerCase().includes(normalizedLocation));
    }

    return filtered;
  }
}
