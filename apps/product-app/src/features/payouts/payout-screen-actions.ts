import { createGetMyPayoutsRequest } from '@quickwerk/api-client';
import type { PayoutRecord } from '@quickwerk/domain';

import { runtimeConfig } from '../../shared/runtime-config';
import type { PayoutLoadState } from './payout-state';

export async function loadMyPayouts(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PayoutLoadState> {
  const request = createGetMyPayoutsRequest(sessionToken);

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return { status: 'error', message: `Failed to load payouts: HTTP ${response.status}.` };
    }

    const payouts = (await response.json()) as PayoutRecord[];

    return { status: 'loaded', payouts };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error loading payouts.',
    };
  }
}
