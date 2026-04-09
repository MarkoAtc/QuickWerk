import type { DisputeRecord } from '@quickwerk/domain';

export type DisputeQueueState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; disputes: DisputeRecord[] }
  | { status: 'error'; errorMessage: string };

export const createLoadingState = (): DisputeQueueState => ({ status: 'loading' });
export const createEmptyState = (): DisputeQueueState => ({ status: 'empty' });
export const createLoadedState = (disputes: DisputeRecord[]): DisputeQueueState => ({ status: 'loaded', disputes });
export const createErrorState = (errorMessage: string): DisputeQueueState => ({ status: 'error', errorMessage });
