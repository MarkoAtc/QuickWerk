import { describe, expect, it } from 'vitest';

import { defaultSessionBootstrap, loadSessionBootstrap, signInWithSessionBootstrap } from './session-bootstrap';

describe('loadSessionBootstrap', () => {
  it('falls back with a useful error when the bootstrap request returns a non-OK HTTP status', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 503,
      }) as Response;

    const result = await loadSessionBootstrap(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      ...defaultSessionBootstrap,
      errorMessage: 'Session bootstrap request failed with HTTP 503.',
    });
  });

  it('falls back when fetch throws and preserves the thrown error message', async () => {
    const fetchMock = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3101');
    };

    const result = await loadSessionBootstrap(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      ...defaultSessionBootstrap,
      errorMessage: 'connect ECONNREFUSED 127.0.0.1:3101',
    });
  });

  it('sanitizes invalid payload values and returns safe defaults with platform-api source', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          sessionState: 'ghost-session',
          nextStep: 'magic-sign-in',
          availableActions: ['admin-root', 'nope-action'],
        }),
      }) as Response;

    const result = await loadSessionBootstrap(fetchMock as typeof fetch);

    expect(result).toMatchObject({
      availableActions: defaultSessionBootstrap.availableActions,
      nextStep: defaultSessionBootstrap.nextStep,
      sessionState: defaultSessionBootstrap.sessionState,
      source: 'platform-api',
    });
    expect(result.errorMessage).toBeUndefined();
  });

  it('passes bearer token headers when resolving authenticated session state', async () => {
    const fetchCalls: Array<{ headers?: Record<string, string> }> = [];
    const fetchMock = async (_url: string, init?: RequestInit) => {
      fetchCalls.push({ headers: init?.headers as Record<string, string> | undefined });

      return {
        ok: true,
        json: async () => ({
          sessionState: 'authenticated',
          nextStep: 'sign-in',
          availableActions: ['sign-in'],
        }),
      } as Response;
    };

    const result = await loadSessionBootstrap(fetchMock as typeof fetch, { sessionToken: 'abc123' });

    expect(fetchCalls[0]?.headers).toMatchObject({ authorization: 'Bearer abc123' });
    expect(result.sessionState).toBe('authenticated');
  });
});

describe('signInWithSessionBootstrap', () => {
  it('returns token and authenticated state when sign-in succeeds', async () => {
    const fetchMock = async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ token: 'session-123' }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          sessionState: 'authenticated',
          nextStep: 'sign-in',
          availableActions: ['sign-in', 'sign-up'],
        }),
      } as Response;
    };

    const result = await signInWithSessionBootstrap(fetchMock as typeof fetch);

    expect(result.sessionToken).toBe('session-123');
    expect(result.sessionBootstrap).toMatchObject({
      sessionState: 'authenticated',
      source: 'platform-api',
    });
    expect(result.errorMessage).toBeUndefined();
  });
});
