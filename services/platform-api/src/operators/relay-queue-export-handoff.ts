import {
  InMemoryRelayQueueExportHandoffStore,
  RelayQueueExportHandoffRecord,
  RelayQueueExportHandoffStore,
} from './relay-queue-export-handoff-store';

export const relayQueueExportHandoffTtlMs = 20 * 60_000;
export const maxRetainedRelayQueueExportHandoffs = 50;

const inMemoryStore = new InMemoryRelayQueueExportHandoffStore();

export async function createRelayQueueExportHandoff(input: {
  rowLimit: number;
  filters: RelayQueueExportHandoffRecord['filters'];
  run: () => Promise<string>;
  store?: RelayQueueExportHandoffStore;
}): Promise<RelayQueueExportHandoffRecord> {
  const store = input.store ?? inMemoryStore;
  await store.evictExpired();
  await store.evictOverflow(maxRetainedRelayQueueExportHandoffs);

  const now = new Date();
  const id = `rqx_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const record: RelayQueueExportHandoffRecord = {
    id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + relayQueueExportHandoffTtlMs).toISOString(),
    status: 'pending',
    rowLimit: input.rowLimit,
    filters: input.filters,
  };

  await store.create(record);

  queueMicrotask(() => {
    void input
      .run()
      .then((csv) => {
        return store.markReady(id, csv);
      })
      .catch((error: unknown) => {
        return store.markFailed(id, error instanceof Error ? error.message : 'export generation failed');
      });
  });

  return record;
}

export async function getRelayQueueExportHandoff(
  id: string,
  store?: RelayQueueExportHandoffStore,
): Promise<RelayQueueExportHandoffRecord | null> {
  const resolvedStore = store ?? inMemoryStore;
  await resolvedStore.evictExpired();
  return resolvedStore.findById(id);
}

export function resetRelayQueueExportHandoffsForTests() {
  inMemoryStore.resetForTests();
}
