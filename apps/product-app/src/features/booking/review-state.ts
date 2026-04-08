import type { ReviewRecord } from '@quickwerk/domain';

export type ReviewSubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'submitted'; review: ReviewRecord }
  | { status: 'error'; message: string };

export type ReviewLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; reviews: ReviewRecord[] }
  | { status: 'error'; message: string };

export const initialReviewSubmitState: ReviewSubmitState = { status: 'idle' };
export const initialReviewLoadState: ReviewLoadState = { status: 'idle' };
