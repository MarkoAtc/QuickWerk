import { Injectable } from '@nestjs/common';

import { PostgresClient } from '../persistence/postgres-client';
import {
  requirePostgresPersistenceConfig,
  resolvePersistenceMode,
} from '../persistence/persistence-mode';

export type RelayQueueExportHandoffStatus = 'pending' | 'ready' | 'failed';

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

export interface RelayQueueExportHandoffStore {
  create(record: RelayQueueExportHandoffRecord): Promise<void>;
  findById(id: string): Promise<RelayQueueExportHandoffRecord | null>;
  markReady(id: string, csv: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  evictExpired(): Promise<void>;
  evictOverflow(maxRetained: number): Promise<void>;
}

@Injectable()
export class InMemoryRelayQueueExportHandoffStore implements RelayQueueExportHandoffStore {
  private readonly handoffs = new Map<string, RelayQueueExportHandoffRecord>();

  async create(record: RelayQueueExportHandoffRecord): Promise<void> {
    this.handoffs.set(record.id, record);
  }

  async findById(id: string): Promise<RelayQueueExportHandoffRecord | null> {
    return this.handoffs.get(id) ?? null;
  }

  async markReady(id: string, csv: string): Promise<void> {
    const existing = this.handoffs.get(id);
    if (!existing) return;
    this.handoffs.set(id, { ...existing, status: 'ready', csv, error: undefined });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const existing = this.handoffs.get(id);
    if (!existing) return;
    this.handoffs.set(id, { ...existing, status: 'failed', error, csv: undefined });
  }

  async evictExpired(): Promise<void> {
    const nowMs = Date.now();
    for (const [id, handoff] of this.handoffs.entries()) {
      const expiresAtMs = new Date(handoff.expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
        this.handoffs.delete(id);
      }
    }
  }

  async evictOverflow(maxRetained: number): Promise<void> {
    if (this.handoffs.size <= maxRetained) {
      return;
    }

    const sorted = [...this.handoffs.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const toDelete = sorted.slice(0, Math.max(0, this.handoffs.size - maxRetained));
    for (const record of toDelete) {
      this.handoffs.delete(record.id);
    }
  }

  resetForTests() {
    this.handoffs.clear();
  }
}

type RelayQueueCsvHandoffRow = {
  id: string;
  status: RelayQueueExportHandoffStatus;
  createdAt: string;
  expiresAt: string;
  rowLimit: number | string;
  filters: RelayQueueExportHandoffRecord['filters'] | string;
  csv: string | null;
  error: string | null;
};

export class PostgresRelayQueueExportHandoffStore implements RelayQueueExportHandoffStore {
  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  private getConfig() {
    return requirePostgresPersistenceConfig(this.env);
  }

  async create(record: RelayQueueExportHandoffRecord): Promise<void> {
    const config = this.getConfig();
    await this.postgresClient.query<object>(
      config,
      `INSERT INTO relay_csv_handoff_jobs (
         id,
         status,
         created_at,
         expires_at,
         row_count,
         filters_snapshot,
         csv_payload,
         error_message
       ) VALUES (
         $1,
         $2,
         $3::timestamptz,
         $4::timestamptz,
         $5,
         $6::jsonb,
         NULL,
         NULL
       )`,
      [
        record.id,
        record.status,
        record.createdAt,
        record.expiresAt,
        record.rowLimit,
        JSON.stringify(record.filters),
      ],
    );
  }

  async findById(id: string): Promise<RelayQueueExportHandoffRecord | null> {
    const config = this.getConfig();
    const result = await this.postgresClient.query<RelayQueueCsvHandoffRow>(
      config,
      `SELECT
         id,
         status,
         created_at::text AS "createdAt",
         expires_at::text AS "expiresAt",
         row_count AS "rowLimit",
         filters_snapshot::text AS filters,
         csv_payload AS csv,
         error_message AS error
       FROM relay_csv_handoff_jobs
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      rowLimit: Number(row.rowLimit),
      filters: typeof row.filters === 'string' ? (JSON.parse(row.filters) as RelayQueueExportHandoffRecord['filters']) : row.filters,
      csv: row.csv ?? undefined,
      error: row.error ?? undefined,
    };
  }

  async markReady(id: string, csv: string): Promise<void> {
    const config = this.getConfig();
    await this.postgresClient.query<object>(
      config,
      `UPDATE relay_csv_handoff_jobs
       SET status = 'ready',
           csv_payload = $2,
           error_message = NULL
       WHERE id = $1`,
      [id, csv],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    const config = this.getConfig();
    await this.postgresClient.query<object>(
      config,
      `UPDATE relay_csv_handoff_jobs
       SET status = 'failed',
           error_message = $2,
           csv_payload = NULL
       WHERE id = $1`,
      [id, error],
    );
  }

  async evictExpired(): Promise<void> {
    const config = this.getConfig();
    await this.postgresClient.query<object>(
      config,
      `DELETE FROM relay_csv_handoff_jobs
       WHERE expires_at <= NOW()`,
    );
  }

  async evictOverflow(maxRetained: number): Promise<void> {
    const config = this.getConfig();
    await this.postgresClient.query<object>(
      config,
      `DELETE FROM relay_csv_handoff_jobs
       WHERE id IN (
         SELECT id
         FROM relay_csv_handoff_jobs
         ORDER BY created_at DESC
         OFFSET $1
       )`,
      [Math.max(0, maxRetained)],
    );
  }
}

export function resolveRelayQueueExportHandoffStore(input: {
  postgresClient: PostgresClient;
  env?: NodeJS.ProcessEnv;
}): RelayQueueExportHandoffStore {
  const env = input.env ?? process.env;
  const mode = resolvePersistenceMode(env);

  if (mode === 'postgres' && env.DATABASE_URL?.trim()) {
    return new PostgresRelayQueueExportHandoffStore(input.postgresClient, env);
  }

  return new InMemoryRelayQueueExportHandoffStore();
}
