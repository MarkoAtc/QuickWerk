import { afterEach, describe, expect, it } from 'vitest';

import { resolveOperatorSession } from './operator-session';

const previousSessionToken = process.env['QUICKWERK_ADMIN_SESSION_TOKEN'];
const previousBootstrapEmail = process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'];

afterEach(() => {
  if (previousSessionToken === undefined) {
    delete process.env['QUICKWERK_ADMIN_SESSION_TOKEN'];
  } else {
    process.env['QUICKWERK_ADMIN_SESSION_TOKEN'] = previousSessionToken;
  }

  if (previousBootstrapEmail === undefined) {
    delete process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'];
  } else {
    process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'] = previousBootstrapEmail;
  }
});

describe('operator-session', () => {
  it('returns a configuration error when no bootstrap env is present', async () => {
    delete process.env['QUICKWERK_ADMIN_SESSION_TOKEN'];
    delete process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'];

    const result = await resolveOperatorSession();

    expect(result).toEqual({
      ok: false,
      errorMessage:
        'Missing admin session bootstrap. Set QUICKWERK_ADMIN_SESSION_TOKEN or QUICKWERK_ADMIN_BOOTSTRAP_EMAIL.',
    });
  });

  it('validates an env-backed operator token', async () => {
    process.env['QUICKWERK_ADMIN_SESSION_TOKEN'] = 'env-token';
    delete process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'];

    const fetchImpl = async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://127.0.0.1:3101/api/v1/auth/session');
      expect(init?.headers).toEqual({ authorization: 'Bearer env-token' });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          sessionState: 'authenticated',
          session: {
            userId: 'operator-1',
            email: 'operator@example.com',
            role: 'operator',
          },
        }),
      } as Response;
    };

    const result = await resolveOperatorSession(fetchImpl as typeof fetch);

    expect(result).toEqual({
      ok: true,
      sessionToken: 'env-token',
      operatorEmail: 'operator@example.com',
      operatorUserId: 'operator-1',
      source: 'env-token',
    });
  });

  it('bootstraps an operator token via sign-in email', async () => {
    delete process.env['QUICKWERK_ADMIN_SESSION_TOKEN'];
    process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL'] = 'operator@example.com';

    const fetchImpl = async (url: string, init?: RequestInit) => {
      expect(url).toBe('http://127.0.0.1:3101/api/v1/auth/sign-in');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ email: 'operator@example.com', role: 'operator' }));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: 'bootstrap-token',
          sessionState: 'authenticated',
          session: {
            userId: 'operator-2',
            email: 'operator@example.com',
            role: 'operator',
          },
        }),
      } as Response;
    };

    const result = await resolveOperatorSession(fetchImpl as typeof fetch);

    expect(result).toEqual({
      ok: true,
      sessionToken: 'bootstrap-token',
      operatorEmail: 'operator@example.com',
      operatorUserId: 'operator-2',
      source: 'bootstrap-sign-in',
    });
  });
});
