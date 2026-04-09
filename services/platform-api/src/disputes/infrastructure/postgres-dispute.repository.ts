import type { DisputeRecord, DisputeStatus } from '@quickwerk/domain';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresPersistenceConfig } from '../../persistence/persistence-mode';
import { DisputeRepository } from '../domain/dispute.repository';

type DisputeRow = {
  id: string;
  booking_id: string;
  reporter_user_id: string;
  reporter_role: 'customer' | 'provider';
  category: DisputeRecord['category'];
  description: string;
  status: DisputeStatus;
  created_at: Date | string;
  resolved_at: Date | string | null;
  resolution_note: string | null;
};

export class PostgresDisputeRepository implements DisputeRepository {
  constructor(
    private readonly postgresClient: PostgresClient,
    private readonly postgresConfig: PostgresPersistenceConfig,
  ) {}

  async save(dispute: DisputeRecord): Promise<{ ok: boolean }> {
    const result = await this.postgresClient.query(
      this.postgresConfig,
      `INSERT INTO disputes (
        id,
        booking_id,
        reporter_user_id,
        reporter_role,
        category,
        description,
        status,
        created_at,
        resolved_at,
        resolution_note
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        $5,
        $6,
        $7,
        $8::timestamptz,
        $9::timestamptz,
        $10
      ) ON CONFLICT (booking_id, reporter_user_id) DO NOTHING`,
      [
        dispute.disputeId,
        dispute.bookingId,
        dispute.reporterUserId,
        dispute.reporterRole,
        dispute.category,
        dispute.description,
        dispute.status,
        dispute.createdAt,
        dispute.resolvedAt,
        dispute.resolutionNote,
      ],
    );

    return { ok: (result.rowCount ?? 0) > 0 };
  }

  async findById(disputeId: string): Promise<DisputeRecord | null> {
    if (!isUuid(disputeId)) {
      return null;
    }

    const result = await this.postgresClient.query<DisputeRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              reporter_user_id::text,
              reporter_role,
              category,
              description,
              status,
              created_at,
              resolved_at,
              resolution_note
       FROM disputes
       WHERE id = $1::uuid
       LIMIT 1`,
      [disputeId],
    );

    return result.rows[0] ? mapDisputeRow(result.rows[0]) : null;
  }

  async findByBookingIdAndReporter(bookingId: string, reporterUserId: string): Promise<DisputeRecord | null> {
    if (!isUuid(bookingId) || !isUuid(reporterUserId)) {
      return null;
    }

    const result = await this.postgresClient.query<DisputeRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              reporter_user_id::text,
              reporter_role,
              category,
              description,
              status,
              created_at,
              resolved_at,
              resolution_note
       FROM disputes
       WHERE booking_id = $1::uuid AND reporter_user_id = $2::uuid
       LIMIT 1`,
      [bookingId, reporterUserId],
    );

    return result.rows[0] ? mapDisputeRow(result.rows[0]) : null;
  }

  async findByReporterUserId(reporterUserId: string): Promise<DisputeRecord[]> {
    if (!isUuid(reporterUserId)) {
      return [];
    }

    const result = await this.postgresClient.query<DisputeRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              reporter_user_id::text,
              reporter_role,
              category,
              description,
              status,
              created_at,
              resolved_at,
              resolution_note
       FROM disputes
       WHERE reporter_user_id = $1::uuid
       ORDER BY created_at DESC`,
      [reporterUserId],
    );

    return result.rows.map(mapDisputeRow);
  }

  async findByStatus(status: DisputeStatus): Promise<DisputeRecord[]> {
    const result = await this.postgresClient.query<DisputeRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              reporter_user_id::text,
              reporter_role,
              category,
              description,
              status,
              created_at,
              resolved_at,
              resolution_note
       FROM disputes
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status],
    );

    return result.rows.map(mapDisputeRow);
  }

  async findByStatuses(statuses: DisputeStatus[]): Promise<DisputeRecord[]> {
    const result = await this.postgresClient.query<DisputeRow>(
      this.postgresConfig,
      `SELECT id::text,
              booking_id::text,
              reporter_user_id::text,
              reporter_role,
              category,
              description,
              status,
              created_at,
              resolved_at,
              resolution_note
       FROM disputes
       WHERE status = ANY($1::text[])
       ORDER BY created_at ASC`,
      [statuses],
    );

    return result.rows.map(mapDisputeRow);
  }

  async transitionStatus(input: {
    disputeId: string;
    allowedCurrentStatuses: DisputeStatus[];
    nextStatus: DisputeStatus;
    resolvedAt?: string | null;
    resolutionNote?: string | null;
  }): Promise<
    | { ok: true; dispute: DisputeRecord; replayed: boolean }
    | { ok: false; reason: 'not-found' }
    | { ok: false; reason: 'transition-conflict'; currentStatus: DisputeStatus }
  > {
    if (!isUuid(input.disputeId)) {
      return { ok: false, reason: 'not-found' };
    }

    return this.postgresClient.withTransaction(async (client) => {
      const currentResult = await client.query<DisputeRow>(
        `SELECT id::text,
                booking_id::text,
                reporter_user_id::text,
                reporter_role,
                category,
                description,
                status,
                created_at,
                resolved_at,
                resolution_note
         FROM disputes
         WHERE id = $1::uuid
         FOR UPDATE`,
        [input.disputeId],
      );

      const current = currentResult.rows[0];

      if (!current) {
        return { ok: false, reason: 'not-found' } as const;
      }

      if (current.status === input.nextStatus) {
        return { ok: true, dispute: mapDisputeRow(current), replayed: true } as const;
      }

      if (!input.allowedCurrentStatuses.includes(current.status)) {
        return { ok: false, reason: 'transition-conflict', currentStatus: current.status } as const;
      }

      const nextResolvedAt = input.resolvedAt === undefined ? current.resolved_at : input.resolvedAt;
      const nextResolutionNote = input.resolutionNote === undefined ? current.resolution_note : input.resolutionNote;

      const updatedResult = await client.query<DisputeRow>(
        `UPDATE disputes
         SET status = $2,
             resolved_at = $3::timestamptz,
             resolution_note = $4
         WHERE id = $1::uuid
         RETURNING id::text,
                   booking_id::text,
                   reporter_user_id::text,
                   reporter_role,
                   category,
                   description,
                   status,
                   created_at,
                   resolved_at,
                   resolution_note`,
        [input.disputeId, input.nextStatus, nextResolvedAt, nextResolutionNote],
      );

      const updated = updatedResult.rows[0];

      if (!updated) {
        return { ok: false, reason: 'not-found' } as const;
      }

      return { ok: true, dispute: mapDisputeRow(updated), replayed: false } as const;
    }, {
      ...process.env,
      DATABASE_URL: this.postgresConfig.databaseUrl,
      PERSISTENCE_MODE: 'postgres',
    });
  }
}

function mapDisputeRow(row: DisputeRow): DisputeRecord {
  return {
    disputeId: row.id,
    bookingId: row.booking_id,
    reporterUserId: row.reporter_user_id,
    reporterRole: row.reporter_role,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    resolvedAt: row.resolved_at ? toIsoString(row.resolved_at) : null,
    resolutionNote: row.resolution_note,
  };
}

function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
