import type { PayoutRecord } from '@quickwerk/domain';

export type PayoutLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; payouts: PayoutRecord[] }
  | { status: 'error'; message: string };

export const initialPayoutLoadState: PayoutLoadState = { status: 'idle' };
