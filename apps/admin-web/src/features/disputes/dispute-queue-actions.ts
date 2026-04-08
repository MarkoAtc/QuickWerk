import { createGetPendingDisputesRequest } from '@quickwerk/api-client';
import type { DisputeRecord } from '@quickwerk/domain';

import type { DisputeQueueState } from './dispute-queue-state';
import { createEmptyState, createErrorState, createLoadedState } from './dispute-queue-state';

const PLATFORM_API_BASE_URL =
  typeof process !== 'undefined'
    ? (process.env['NEXT_PUBLIC_PLATFORM_API_BASE_URL'] ?? 'http://127.0.0.1:3101')
    : 'http://127.0.0.1:3101';

const isDisputeRecord = (value: unknown): value is DisputeRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record['disputeId'] === 'string' &&
    typeof record['bookingId'] === 'string' &&
    typeof record['reporterUserId'] === 'string' &&
    (record['reporterRole'] === 'customer' || record['reporterRole'] === 'provider') &&
    typeof record['category'] === 'string' &&
    typeof record['description'] === 'string' &&
    typeof record['status'] === 'string' &&
    typeof record['createdAt'] === 'string'
  );
};

const isDisputeRecordArray = (value: unknown): value is DisputeRecord[] =>
  Array.isArray(value) && value.every(isDisputeRecord);

export async function loadDisputeQueueState(
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DisputeQueueState> {
  const request = createGetPendingDisputesRequest(sessionToken);
  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}${request.path}`, {
      method: request.method,
      headers: request.headers,
    });
    if (!response.ok) {
      return createErrorState(`Failed to load disputes: HTTP ${response.status}.`);
    }
    const payload = (await response.json()) as unknown;
    if (!isDisputeRecordArray(payload)) {
      return createErrorState('Unexpected response format for pending disputes.');
    }
    if (payload.length === 0) return createEmptyState();
    return createLoadedState(payload);
  } catch (error) {
    return createErrorState(error instanceof Error ? error.message : 'Unknown error loading dispute queue.');
  }
}
