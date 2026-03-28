import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  DocumentMetadata,
  ProviderVerificationRecord,
  ProviderVerificationRepository,
  ReviewVerificationInput,
  ReviewVerificationResult,
  SubmitProviderVerificationInput,
} from '../domain/provider-verification.repository';

@Injectable()
export class InMemoryProviderVerificationRepository implements ProviderVerificationRepository {
  private readonly records = new Map<string, ProviderVerificationRecord>();

  async submitVerification(input: SubmitProviderVerificationInput): Promise<ProviderVerificationRecord> {
    const verificationId = randomUUID();

    const documents: DocumentMetadata[] = input.documents.map((d) => ({
      documentId: randomUUID(),
      filename: d.filename,
      mimeType: d.mimeType,
      description: d.description,
      uploadedAt: input.submittedAt,
    }));

    const record: ProviderVerificationRecord = {
      verificationId,
      providerUserId: input.providerUserId,
      providerEmail: input.providerEmail,
      businessName: input.businessName,
      tradeCategories: [...input.tradeCategories],
      serviceArea: input.serviceArea,
      documents,
      status: 'pending',
      submittedAt: input.submittedAt,
      statusHistory: [
        {
          changedAt: input.submittedAt,
          from: null,
          to: 'pending',
          actorUserId: input.providerUserId,
          actorRole: 'provider',
        },
      ],
    };

    this.records.set(verificationId, record);

    return record;
  }

  async getVerification(verificationId: string): Promise<ProviderVerificationRecord | null> {
    return this.records.get(verificationId) ?? null;
  }

  async getVerificationByProviderId(providerUserId: string): Promise<ProviderVerificationRecord | null> {
    for (const record of this.records.values()) {
      if (record.providerUserId === providerUserId) {
        return record;
      }
    }
    return null;
  }

  async listPendingVerifications(): Promise<ProviderVerificationRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.status === 'pending');
  }

  async reviewVerification(input: ReviewVerificationInput): Promise<ReviewVerificationResult> {
    const record = this.records.get(input.verificationId);

    if (!record) {
      return { ok: false, reason: 'not-found' };
    }

    if (record.status !== 'pending') {
      return { ok: false, reason: 'already-decided', currentStatus: record.status };
    }

    const updatedRecord: ProviderVerificationRecord = {
      ...record,
      status: input.decision,
      reviewedAt: input.reviewedAt,
      reviewedByUserId: input.reviewedByUserId,
      reviewNote: input.reviewNote,
      statusHistory: [
        ...record.statusHistory,
        {
          changedAt: input.reviewedAt,
          from: 'pending',
          to: input.decision,
          actorUserId: input.reviewedByUserId,
          actorRole: input.reviewedByRole,
          note: input.reviewNote,
        },
      ],
    };

    this.records.set(input.verificationId, updatedRecord);

    return { ok: true, record: updatedRecord };
  }
}
