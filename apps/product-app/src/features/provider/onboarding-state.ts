export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type OnboardingDocumentInput = {
  filename: string;
  mimeType: string;
  description?: string;
};

export type OnboardingFormData = {
  businessName: string;
  tradeCategories: string[];
  serviceArea: string;
  documents: OnboardingDocumentInput[];
};

export type VerificationRecord = {
  verificationId: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  businessName?: string;
  tradeCategories: string[];
  serviceArea?: string;
  documents: Array<{
    documentId: string;
    filename: string;
    mimeType: string;
    description?: string;
    uploadedAt: string;
  }>;
};

export type ProviderOnboardingState =
  | { status: 'checking' }
  | { status: 'not-submitted' }
  | { status: 'submitting'; formData: OnboardingFormData }
  | { status: 'pending'; verification: VerificationRecord }
  | { status: 'approved'; verification: VerificationRecord }
  | { status: 'rejected'; verification: VerificationRecord }
  | { status: 'error'; errorMessage: string };

export const createCheckingState = (): ProviderOnboardingState => ({ status: 'checking' });

export const createNotSubmittedState = (): ProviderOnboardingState => ({ status: 'not-submitted' });

export const createSubmittingState = (formData: OnboardingFormData): ProviderOnboardingState => ({
  status: 'submitting',
  formData,
});

export const createPendingState = (verification: VerificationRecord): ProviderOnboardingState => ({
  status: 'pending',
  verification,
});

export const createApprovedState = (verification: VerificationRecord): ProviderOnboardingState => ({
  status: 'approved',
  verification,
});

export const createRejectedState = (verification: VerificationRecord): ProviderOnboardingState => ({
  status: 'rejected',
  verification,
});

export const createErrorState = (errorMessage: string): ProviderOnboardingState => ({
  status: 'error',
  errorMessage,
});

export function resolveVerificationStateFromRecord(
  record: VerificationRecord | null,
): ProviderOnboardingState {
  if (!record) {
    return createNotSubmittedState();
  }

  switch (record.status) {
    case 'pending':
      return createPendingState(record);
    case 'approved':
      return createApprovedState(record);
    case 'rejected':
      return createRejectedState(record);
    default:
      return createErrorState(`Unknown verification status: ${(record as { status: unknown }).status}`);
  }
}
