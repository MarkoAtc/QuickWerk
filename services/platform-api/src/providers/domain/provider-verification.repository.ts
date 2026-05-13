export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'request-more-info';

export type DocumentMetadata = {
  documentId: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  description?: string;
};

export type VerificationActorRole = 'provider' | 'operator';

export type ProviderVerificationRecord = {
  verificationId: string;
  providerUserId: string;
  providerEmail: string;
  businessName?: string;
  tradeCategories: string[];
  serviceArea?: string;
  documents: DocumentMetadata[];
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
  statusHistory: readonly VerificationStatusEvent[];
};

export type VerificationStatusEvent = {
  changedAt: string;
  from: VerificationStatus | null;
  to: VerificationStatus;
  actorUserId: string;
  actorRole: VerificationActorRole;
  note?: string;
};

export type SubmitProviderVerificationInput = {
  providerUserId: string;
  providerEmail: string;
  businessName?: string;
  tradeCategories: string[];
  serviceArea?: string;
  documents: Omit<DocumentMetadata, 'documentId' | 'uploadedAt'>[];
  submittedAt: string;
};

export type ReviewVerificationInput = {
  verificationId: string;
  reviewedByUserId: string;
  reviewedByRole: VerificationActorRole;
  decision: 'approved' | 'rejected' | 'request-more-info';
  reviewNote?: string;
  reviewedAt: string;
};

export type ReviewVerificationResult =
  | { ok: true; record: ProviderVerificationRecord }
  | { ok: false; reason: 'not-found' | 'already-decided'; currentStatus?: VerificationStatus };

export interface ProviderVerificationRepository {
  submitVerification(input: SubmitProviderVerificationInput): Promise<ProviderVerificationRecord>;
  getVerification(verificationId: string): Promise<ProviderVerificationRecord | null>;
  getVerificationByProviderId(providerUserId: string): Promise<ProviderVerificationRecord | null>;
  listPendingVerifications(): Promise<ProviderVerificationRecord[]>;
  reviewVerification(input: ReviewVerificationInput): Promise<ReviewVerificationResult>;
}

export const PROVIDER_VERIFICATION_REPOSITORY = Symbol('PROVIDER_VERIFICATION_REPOSITORY');
