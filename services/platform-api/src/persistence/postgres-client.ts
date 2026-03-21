import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

import { PostgresPersistenceConfig, requirePostgresPersistenceConfig } from './persistence-mode';

@Injectable()
export class PostgresClient implements OnApplicationShutdown {
  private pool: Pool | null = null;

  getPool(config: PostgresPersistenceConfig): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: config.databaseUrl,
      });
    }

    return this.pool;
  }

  async query<T extends QueryResultRow>(
    config: PostgresPersistenceConfig,
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.getPool(config).query<T>(text, values as unknown[]);
  }

  async withTransaction<T>(
    fn: (client: PoolClient, config: PostgresPersistenceConfig) => Promise<T>,
    env: NodeJS.ProcessEnv = process.env,
  ): Promise<T> {
    const config = requirePostgresPersistenceConfig(env);
    const client = await this.getPool(config).connect();

    try {
      await client.query('BEGIN');
      const result = await fn(client, config);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onApplicationShutdown() {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
  }
}
