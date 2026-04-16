export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'request-more-info';

export type VerificationSummary = {
  verificationId: string;
  providerUserId: string;
  providerEmail: string;
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
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
};

export type ReviewAction =
  | { status: 'idle' }
  | { status: 'reviewing'; verificationId: string }
  | { status: 'done'; verificationId: string; decision: 'approved' | 'rejected' | 'request-more-info' }
  | { status: 'error'; verificationId: string; errorMessage: string };

export type VerificationQueueState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; verifications: VerificationSummary[]; reviewAction: ReviewAction }
  | { status: 'error'; errorMessage: string };

export const createLoadingQueueState = (): VerificationQueueState => ({ status: 'loading' });

export const createEmptyQueueState = (): VerificationQueueState => ({ status: 'empty' });

export const createLoadedQueueState = (verifications: VerificationSummary[]): VerificationQueueState => ({
  status: 'loaded',
  verifications,
  reviewAction: { status: 'idle' },
});

export const createQueueErrorState = (errorMessage: string): VerificationQueueState => ({
  status: 'error',
  errorMessage,
});

export const applyReviewDecision = (
  state: VerificationQueueState,
  verificationId: string,
  decision: 'approved' | 'rejected' | 'request-more-info',
): VerificationQueueState => {
  if (state.status !== 'loaded') return state;

  return {
    ...state,
    verifications: state.verifications.filter((v) => v.verificationId !== verificationId),
    reviewAction: { status: 'done', verificationId, decision },
  };
};
