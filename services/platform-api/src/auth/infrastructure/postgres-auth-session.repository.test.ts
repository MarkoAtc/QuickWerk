import { describe, expect, it, vi } from 'vitest';

import { PostgresClient } from '../../persistence/postgres-client';
import { PostgresAuthSessionRepository } from './postgres-auth-session.repository';

const postgresConfig = {
  databaseUrl: 'postgres://quickwerk:quickwerk@localhost:5432/quickwerk',
} as const;

describe('PostgresAuthSessionRepository', () => {
  it('persists sign-in, resolves session, and deletes session', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            token: '11111111-1111-4111-8111-111111111111',
            user_id: '22222222-2222-4222-8222-222222222222',
            created_at: '2026-03-20T12:00:00.000Z',
            expires_at: '2026-03-20T12:30:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            token: '11111111-1111-4111-8111-111111111111',
            user_id: '22222222-2222-4222-8222-222222222222',
            created_at: '2026-03-20T12:00:00.000Z',
            expires_at: '2026-03-20T12:30:00.000Z',
            email: 'customer@quickwerk.local',
            role: 'customer',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    const created = await repository.createSession({
      email: 'customer@quickwerk.local',
      role: 'customer',
    });

    expect(created.userId).toBe('22222222-2222-4222-8222-222222222222');
    expect(created.token).toBe('11111111-1111-4111-8111-111111111111');
    expect(created.expiresAt).toBe('2026-03-20T12:30:00.000Z');

    expect(query.mock.calls[1]?.[1]).toContain('make_interval');

    const resolved = await repository.resolveSession(created.token);
    expect(resolved).toMatchObject({
      email: 'customer@quickwerk.local',
      role: 'customer',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    const deleted = await repository.deleteSession(created.token);
    expect(deleted).toBe(true);
  });

  it('invalidates an expired token on resolve and returns null', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    await expect(repository.resolveSession('11111111-1111-4111-8111-111111111111')).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns null/false for missing or invalid tokens without querying', async () => {
    const query = vi.fn();
    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    await expect(repository.resolveSession(undefined)).resolves.toBeNull();
    await expect(repository.resolveSession('not-a-uuid')).resolves.toBeNull();
    await expect(repository.deleteSession(undefined)).resolves.toBe(false);
    await expect(repository.deleteSession('not-a-uuid')).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('registers a customer and returns a session token', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '22222222-2222-4222-8222-222222222222' }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            token: '11111111-1111-4111-8111-111111111111',
            user_id: '22222222-2222-4222-8222-222222222222',
            created_at: '2026-03-20T12:00:00.000Z',
            expires_at: '2026-03-20T12:30:00.000Z',
          },
        ],
      });

    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    const registration = await repository.registerCustomer({
      name: 'Marta Meister',
      email: 'MARTA@quickwerk.local',
      password: 'supersecure',
      role: 'customer',
    });

    expect(registration).toMatchObject({
      email: 'marta@quickwerk.local',
      role: 'customer',
      token: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    const registrationQueryParams = query.mock.calls[0]?.[1] as unknown[] | undefined;
    expect(registrationQueryParams?.[2]).toBe('customer');
    const storedPasswordHash = registrationQueryParams?.[4];
    expect(typeof storedPasswordHash).toBe('string');
    expect(storedPasswordHash).toMatch(/^scrypt\$/);
    expect(storedPasswordHash).not.toBe('supersecure');
  });

  it('registers a provider account with the requested role', async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: '22222222-2222-4222-8222-222222222222' }],
    }).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          token: '11111111-1111-4111-8111-111111111111',
          user_id: '22222222-2222-4222-8222-222222222222',
          created_at: '2026-03-20T12:00:00.000Z',
          expires_at: '2026-03-20T12:30:00.000Z',
        },
      ],
    });

    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    const registration = await repository.registerCustomer({
      name: 'Priya Provider',
      email: 'priya@quickwerk.local',
      password: 'supersecure',
      role: 'provider',
    });

    expect(registration.role).toBe('provider');
    const registrationQueryParams = query.mock.calls[0]?.[1] as unknown[] | undefined;
    expect(registrationQueryParams?.[2]).toBe('provider');
  });

  it('throws a duplicate-email error when registration email already exists', async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 0,
      rows: [],
    });

    const repository = new PostgresAuthSessionRepository(
      {
        query,
        withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }),
      } as unknown as PostgresClient,
      postgresConfig,
    );

    await expect(
      repository.registerCustomer({
        name: 'Marta Meister',
        email: 'marta@quickwerk.local',
        password: 'supersecure',
        role: 'customer',
      }),
    ).rejects.toThrow('already exists');
  });

  describe('phone + OTP auth', () => {
    it('requests then verifies an OTP end to end, upserting a phone-authenticated user', async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // cooldown check: none active
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // delete prior active codes
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // insert new code

      const repository = new PostgresAuthSessionRepository(
        { query, withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }) } as unknown as PostgresClient,
        postgresConfig,
      );

      const requested = await repository.requestOtp('+15550001234');
      expect(requested.devCode).toMatch(/^\d{6}$/);

      const insertArgs = query.mock.calls[2]?.[2] as unknown[];
      const codeHash = insertArgs?.[2] as string;
      expect(codeHash).toMatch(/^scrypt\$/);

      query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              code_hash: codeHash,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              attempt_count: 0,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // mark consumed
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: '22222222-2222-4222-8222-222222222222', role: 'customer' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              token: '11111111-1111-4111-8111-111111111111',
              user_id: '22222222-2222-4222-8222-222222222222',
              created_at: '2026-03-20T12:00:00.000Z',
              expires_at: '2026-03-20T12:30:00.000Z',
            },
          ],
        });

      const session = await repository.verifyOtp({ phone: '+15550001234', code: requested.devCode as string });

      expect(session).toMatchObject({
        email: '15550001234@phone.quickwerk.local',
        role: 'customer',
        token: '11111111-1111-4111-8111-111111111111',
        userId: '22222222-2222-4222-8222-222222222222',
      });
    });

    it('rejects a second OTP request within the cooldown window', async () => {
      const query = vi.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: '33333333-3333-4333-8333-333333333333' }],
      });

      const repository = new PostgresAuthSessionRepository(
        { query, withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }) } as unknown as PostgresClient,
        postgresConfig,
      );

      await expect(repository.requestOtp('+15550001234')).rejects.toThrow('already requested for phone');
    });

    it('rejects verification when no active code exists for the phone', async () => {
      const query = vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const repository = new PostgresAuthSessionRepository(
        { query, withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }) } as unknown as PostgresClient,
        postgresConfig,
      );

      await expect(
        repository.verifyOtp({ phone: '+15550001234', code: '123456' }),
      ).rejects.toThrow('Invalid or already-used verification code');
    });

    it('rejects verification with an expired code', async () => {
      const query = vi.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            code_hash: 'scrypt$deadbeef$00',
            expires_at: new Date(Date.now() - 1000).toISOString(),
            attempt_count: 0,
          },
        ],
      });

      const repository = new PostgresAuthSessionRepository(
        { query, withTransaction: async <T>(fn: (client: { query: typeof query }) => Promise<T>) => fn({ query }) } as unknown as PostgresClient,
        postgresConfig,
      );

      await expect(
        repository.verifyOtp({ phone: '+15550001234', code: '123456' }),
      ).rejects.toThrow('has expired');
    });
  });
});
