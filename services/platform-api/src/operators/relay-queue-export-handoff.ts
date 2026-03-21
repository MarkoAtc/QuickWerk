type RelayQueueExportHandoffStatus = 'pending' | 'ready' | 'failed';

export type RelayQueueExportHandoffRecord = {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: RelayQueueExportHandoffStatus;
  rowLimit: number;
  filters: {
    status: string;
    correlationId: string | null;
    eventId: string | null;
    terminalOnly: boolean;
    fields: string[];
  };
  csv?: string;
  error?: string;
};

const handoffTtlMs = 20 * 60_000;
const maxRetainedHandoffs = 50;

const handoffs = new Map<string, RelayQueueExportHandoffRecord>();

export function createRelayQueueExportHandoff(input: {
  rowLimit: number;
  filters: RelayQueueExportHandoffRecord['filters'];
  run: () => Promise<string>;
}): RelayQueueExportHandoffRecord {
  evictExpiredHandoffs();

  if (handoffs.size >= maxRetainedHandoffs) {
    const oldest = [...handoffs.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (oldest) {
      handoffs.delete(oldest.id);
    }
  }

  const now = new Date();
  const id = `rqx_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const record: RelayQueueExportHandoffRecord = {
    id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + handoffTtlMs).toISOString(),
    status: 'pending',
    rowLimit: input.rowLimit,
    filters: input.filters,
  };

  handoffs.set(id, record);

  queueMicrotask(() => {
    void input
      .run()
      .then((csv) => {
        const current = handoffs.get(id);

        if (!current) {
          return;
        }

        handoffs.set(id, {
          ...current,
          status: 'ready',
          csv,
        });
      })
      .catch((error: unknown) => {
        const current = handoffs.get(id);

        if (!current) {
          return;
        }

        handoffs.set(id, {
          ...current,
          status: 'failed',
          error: error instanceof Error ? error.message : 'export generation failed',
        });
      });
  });

  return record;
}

export function getRelayQueueExportHandoff(id: string): RelayQueueExportHandoffRecord | null {
  evictExpiredHandoffs();
  return handoffs.get(id) ?? null;
}

function evictExpiredHandoffs() {
  const now = Date.now();

  for (const [id, handoff] of handoffs.entries()) {
    const expiresAtMs = new Date(handoff.expiresAt).getTime();

    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
      handoffs.delete(id);
    }
  }
}

export function resetRelayQueueExportHandoffsForTests() {
  handoffs.clear();
}
