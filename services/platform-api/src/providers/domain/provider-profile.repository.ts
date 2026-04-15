export type ProviderProfile = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories: string[];
  serviceArea?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertProviderProfileInput = {
  providerUserId: string;
  displayName: string;
  bio?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  isPublic?: boolean;
  now: string;
};

export interface ProviderProfileRepository {
  upsertProfile(input: UpsertProviderProfileInput): Promise<ProviderProfile>;
  getProfileByProviderId(providerUserId: string): Promise<ProviderProfile | null>;
  listPublicProfiles(filter?: { tradeCategory?: string; location?: string }): Promise<ProviderProfile[]>;
  getPublicProfileByProviderId(providerUserId: string): Promise<ProviderProfile | null>;
}

export const PROVIDER_PROFILE_REPOSITORY = Symbol('PROVIDER_PROFILE_REPOSITORY');
