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
      bio: input.bio?.trim() || existing?.bio,
      tradeCategories: (input.tradeCategories ?? existing?.tradeCategories ?? [])
        .map((c) => c.trim())
        .filter(Boolean),
      serviceArea: input.serviceArea?.trim() || existing?.serviceArea,
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

  async listPublicProfiles(filter?: { tradeCategory?: string }): Promise<ProviderProfile[]> {
    const all = Array.from(this.profiles.values()).filter((p) => p.isPublic);

    if (!filter?.tradeCategory) {
      return all;
    }

    const category = filter.tradeCategory.toLowerCase().trim();
    return all.filter((p) => p.tradeCategories.some((c) => c.toLowerCase() === category));
  }
}
