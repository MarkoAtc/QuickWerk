import { Inject, Injectable } from '@nestjs/common';

import type { UploadUrlRecord } from '@quickwerk/domain';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';
import {
  PROVIDER_PROFILE_REPOSITORY,
  ProviderProfile,
  ProviderProfileRepository,
} from './domain/provider-profile.repository';
import {
  PROVIDER_VERIFICATION_REPOSITORY,
  ProviderVerificationRecord,
  ProviderVerificationRepository,
} from './domain/provider-verification.repository';
import { UPLOAD_URL_REPOSITORY, UploadUrlRepository } from './domain/upload-url.repository';

type SubmitVerificationInput = {
  businessName?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  documents?: Array<{
    filename?: string;
    mimeType?: string;
    description?: string;
  }>;
};

type UpsertProfileInput = {
  displayName?: string;
  bio?: string;
  tradeCategories?: string[];
  serviceArea?: string;
  isPublic?: boolean;
};

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(PROVIDER_VERIFICATION_REPOSITORY)
    private readonly verifications: ProviderVerificationRepository,
    @Inject(PROVIDER_PROFILE_REPOSITORY)
    private readonly profiles: ProviderProfileRepository,
    @Inject(UPLOAD_URL_REPOSITORY)
    private readonly uploadUrls: UploadUrlRepository,
  ) {}

  async submitVerification(
    session: AuthSession,
    input: SubmitVerificationInput,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 409; error: string }
    | { ok: true; statusCode: 201; verification: ReturnType<ProvidersService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'provider.verification.submit',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can submit verifications.',
      };
    }

    // Prevent duplicate pending submissions
    const existing = await this.verifications.getVerificationByProviderId(session.userId);
    if (existing && existing.status === 'pending') {
      logStructuredBreadcrumb({
        event: 'provider.verification.submit',
        correlationId,
        status: 'failed',
        details: {
          reason: 'duplicate-pending',
          actorUserId: session.userId,
          existingVerificationId: existing.verificationId,
        },
      });

      return {
        ok: false,
        statusCode: 409,
        error: 'A pending verification already exists for this provider.',
      };
    }

    const documents = (input.documents ?? []).map((d) => ({
      filename: d.filename?.trim() || 'document',
      mimeType: d.mimeType?.trim() || 'application/octet-stream',
      description: d.description?.trim(),
    }));

    const record = await this.verifications.submitVerification({
      providerUserId: session.userId,
      providerEmail: session.email,
      businessName: input.businessName?.trim(),
      tradeCategories: (input.tradeCategories ?? []).map((c) => c.trim()).filter(Boolean),
      serviceArea: input.serviceArea?.trim(),
      documents,
      submittedAt: new Date().toISOString(),
    });

    logStructuredBreadcrumb({
      event: 'provider.verification.submit',
      correlationId,
      status: 'succeeded',
      details: {
        verificationId: record.verificationId,
        actorUserId: session.userId,
        documentCount: record.documents.length,
      },
    });

    return { ok: true, statusCode: 201, verification: this.serializeRecord(record) };
  }

  async getMyVerificationStatus(
    session: AuthSession,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; statusCode: 200; verification: ReturnType<ProvidersService['serializeRecord']> | null }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'provider.verification.get-status',
        correlationId,
        status: 'failed',
        details: { reason: 'role-forbidden', actorRole: session.role, actorUserId: session.userId },
      });

      return { ok: false, statusCode: 403, error: 'Only providers can check their verification status.' };
    }

    const record = await this.verifications.getVerificationByProviderId(session.userId);

    return { ok: true, statusCode: 200, verification: record ? this.serializeRecord(record) : null };
  }

  async listPendingVerifications(
    session: AuthSession,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403; error: string }
    | { ok: true; statusCode: 200; verifications: ReturnType<ProvidersService['serializeRecord']>[] }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'operator') {
      logStructuredBreadcrumb({
        event: 'provider.verification.list-pending',
        correlationId,
        status: 'failed',
        details: { reason: 'role-forbidden', actorRole: session.role, actorUserId: session.userId },
      });

      return { ok: false, statusCode: 403, error: 'Only operators can view the verification queue.' };
    }

    const records = await this.verifications.listPendingVerifications();

    logStructuredBreadcrumb({
      event: 'provider.verification.list-pending',
      correlationId,
      status: 'succeeded',
      details: { actorUserId: session.userId, count: records.length },
    });

    return { ok: true, statusCode: 200, verifications: records.map((r) => this.serializeRecord(r)) };
  }

  async reviewVerification(
    session: AuthSession,
    verificationId: string,
    input: { decision: 'approved' | 'rejected'; reviewNote?: string },
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404 | 409; error: string }
    | { ok: true; statusCode: 200; verification: ReturnType<ProvidersService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'operator') {
      logStructuredBreadcrumb({
        event: 'provider.verification.review',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
          verificationId,
          decision: input.decision,
        },
      });

      return { ok: false, statusCode: 403, error: 'Only operators can review verifications.' };
    }

    const result = await this.verifications.reviewVerification({
      verificationId,
      reviewedByUserId: session.userId,
      reviewedByRole: session.role,
      decision: input.decision,
      reviewNote: input.reviewNote,
      reviewedAt: new Date().toISOString(),
    });

    if (!result.ok) {
      if (result.reason === 'not-found') {
        logStructuredBreadcrumb({
          event: 'provider.verification.review',
          correlationId,
          status: 'failed',
          details: { reason: 'not-found', verificationId, actorUserId: session.userId },
        });
        return { ok: false, statusCode: 404, error: 'Verification not found.' };
      }

      logStructuredBreadcrumb({
        event: 'provider.verification.review',
        correlationId,
        status: 'failed',
        details: {
          reason: 'already-decided',
          verificationId,
          actorUserId: session.userId,
          currentStatus: result.currentStatus,
        },
      });
      return {
        ok: false,
        statusCode: 409,
        error: `Verification has already been decided (status: ${result.currentStatus}).`,
      };
    }

    logStructuredBreadcrumb({
      event: 'provider.verification.review',
      correlationId,
      status: 'succeeded',
      details: {
        verificationId,
        actorUserId: session.userId,
        decision: input.decision,
        hasNote: Boolean(input.reviewNote),
      },
    });

    return { ok: true, statusCode: 200, verification: this.serializeRecord(result.record) };
  }

  async getVerificationById(
    session: AuthSession,
    verificationId: string,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403 | 404; error: string }
    | { ok: true; statusCode: 200; verification: ReturnType<ProvidersService['serializeRecord']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'operator') {
      logStructuredBreadcrumb({
        event: 'provider.verification.get-by-id',
        correlationId,
        status: 'failed',
        details: { reason: 'role-forbidden', actorRole: session.role, actorUserId: session.userId },
      });
      return { ok: false, statusCode: 403, error: 'Only operators can view verification details.' };
    }

    const record = await this.verifications.getVerification(verificationId);

    if (!record) {
      return { ok: false, statusCode: 404, error: 'Verification not found.' };
    }

    return { ok: true, statusCode: 200, verification: this.serializeRecord(record) };
  }

  async upsertProfile(
    session: AuthSession,
    input: UpsertProfileInput,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 400 | 403; error: string }
    | { ok: true; statusCode: 200; profile: ReturnType<ProvidersService['serializeProfile']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'provider.profile.upsert',
        correlationId,
        status: 'failed',
        details: { reason: 'role-forbidden', actorRole: session.role, actorUserId: session.userId },
      });
      return { ok: false, statusCode: 403, error: 'Only providers can manage their profile.' };
    }

    const displayName = input.displayName?.trim();
    if (!displayName) {
      logStructuredBreadcrumb({
        event: 'provider.profile.upsert',
        correlationId,
        status: 'failed',
        details: { reason: 'invalid-display-name', actorUserId: session.userId },
      });
      return { ok: false, statusCode: 400, error: 'displayName is required.' };
    }

    const profile = await this.profiles.upsertProfile({
      providerUserId: session.userId,
      displayName,
      bio: input.bio,
      tradeCategories: input.tradeCategories,
      serviceArea: input.serviceArea,
      isPublic: input.isPublic,
      now: new Date().toISOString(),
    });

    logStructuredBreadcrumb({
      event: 'provider.profile.upsert',
      correlationId,
      status: 'succeeded',
      details: { actorUserId: session.userId, isPublic: profile.isPublic },
    });

    return { ok: true, statusCode: 200, profile: this.serializeProfile(profile) };
  }

  async getPublicProviderById(
    providerUserId: string,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 404; error: string }
    | { ok: true; statusCode: 200; provider: ReturnType<ProvidersService['serializeProfile']> }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';
    const trimmedId = providerUserId?.trim();

    if (!trimmedId) {
      return { ok: false, statusCode: 404, error: 'Provider not found.' };
    }

    const profile = await this.profiles.getPublicProfileByProviderId(trimmedId);

    if (!profile) {
      logStructuredBreadcrumb({
        event: 'provider.discovery.get-public',
        correlationId,
        status: 'failed',
        details: { providerUserId: trimmedId, reason: 'not-found' },
      });

      return { ok: false, statusCode: 404, error: 'Provider not found.' };
    }

    logStructuredBreadcrumb({
      event: 'provider.discovery.get-public',
      correlationId,
      status: 'succeeded',
      details: { providerUserId: trimmedId },
    });

    return { ok: true, statusCode: 200, provider: this.serializeProfile(profile) };
  }

  async listPublicProviders(
    filter?: { tradeCategory?: string; location?: string },
    context?: { correlationId?: string },
  ): Promise<{ ok: true; statusCode: 200; providers: ReturnType<ProvidersService['serializeProfile']>[] }> {
    const correlationId = context?.correlationId ?? 'corr-missing';

    const profiles = await this.profiles.listPublicProfiles(filter);

    logStructuredBreadcrumb({
      event: 'provider.discovery.list-public',
      correlationId,
      status: 'succeeded',
      details: {
        count: profiles.length,
        tradeCategory: filter?.tradeCategory ?? null,
        location: filter?.location ?? null,
      },
    });

    return { ok: true, statusCode: 200, providers: profiles.map((p) => this.serializeProfile(p)) };
  }

  async getMyProfile(
    session: AuthSession,
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403; error: string }
    | { ok: true; statusCode: 200; profile: ReturnType<ProvidersService['serializeProfile']> | null }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'provider.profile.get',
        correlationId,
        status: 'failed',
        details: { reason: 'role-forbidden', actorRole: session.role, actorUserId: session.userId },
      });
      return { ok: false, statusCode: 403, error: 'Only providers can view their own profile.' };
    }

    const profile = await this.profiles.getProfileByProviderId(session.userId);

    return { ok: true, statusCode: 200, profile: profile ? this.serializeProfile(profile) : null };
  }

  private serializeProfile(profile: ProviderProfile) {
    return {
      providerUserId: profile.providerUserId,
      displayName: profile.displayName,
      bio: profile.bio,
      tradeCategories: profile.tradeCategories,
      serviceArea: profile.serviceArea,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    } as const;
  }

  private serializeRecord(record: ProviderVerificationRecord) {
    return {
      verificationId: record.verificationId,
      providerUserId: record.providerUserId,
      providerEmail: record.providerEmail,
      businessName: record.businessName,
      tradeCategories: record.tradeCategories,
      serviceArea: record.serviceArea,
      documents: record.documents.map((d) => ({
        documentId: d.documentId,
        filename: d.filename,
        mimeType: d.mimeType,
        description: d.description,
        uploadedAt: d.uploadedAt,
      })),
      status: record.status,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt,
      reviewedByUserId: record.reviewedByUserId,
      reviewNote: record.reviewNote,
      statusHistory: record.statusHistory,
    } as const;
  }

  async requestUploadUrl(
    session: AuthSession,
    input: { filename: string; mimeType: string },
    context?: { correlationId?: string },
  ): Promise<
    | { ok: false; statusCode: 403; error: string }
    | { ok: true; statusCode: 201; uploadUrl: UploadUrlRecord }
  > {
    const correlationId = context?.correlationId ?? 'corr-missing';

    if (session.role !== 'provider') {
      logStructuredBreadcrumb({
        event: 'provider.upload-url.request',
        correlationId,
        status: 'failed',
        details: {
          reason: 'role-forbidden',
          actorRole: session.role,
          actorUserId: session.userId,
        },
      });

      return {
        ok: false,
        statusCode: 403,
        error: 'Only providers can request upload URLs.',
      };
    }

    const uploadUrl = await this.uploadUrls.createUploadUrl({
      providerUserId: session.userId,
      filename: input.filename,
      mimeType: input.mimeType,
      now: new Date().toISOString(),
    });

    logStructuredBreadcrumb({
      event: 'provider.upload-url.request',
      correlationId,
      status: 'succeeded',
      details: {
        uploadId: uploadUrl.uploadId,
        providerUserId: session.userId,
        filename: input.filename,
        mimeType: input.mimeType,
        expiresAt: uploadUrl.expiresAt,
      },
    });

    return { ok: true, statusCode: 201, uploadUrl };
  }
}
