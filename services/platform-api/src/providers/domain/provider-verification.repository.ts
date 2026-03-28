export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type DocumentMetadata = {
  documentId: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  description?: string;
};

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
  statusHistory: VerificationStatusEvent[];
};

export type VerificationStatusEvent = {
  changedAt: string;
  from: VerificationStatus | null;
  to: VerificationStatus;
  actorUserId: string;
  actorRole: string;
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
  reviewedByRole: string;
  decision: 'approved' | 'rejected';
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
