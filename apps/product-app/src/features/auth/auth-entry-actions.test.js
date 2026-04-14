import { describe, expect, it, vi } from 'vitest';

import { signInWithCredentials, signUpWithCredentials } from './auth-entry-actions';

describe('auth-entry-actions', () => {
  it('returns session token on successful sign-in', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-sign-in', role: 'provider' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await signInWithCredentials(
        { email: 'provider@quickwerk.local', password: 'supersecure', role: 'provider' },
        'http://localhost:3100',
      );
      expect(result).toMatchObject({ ok: true, sessionToken: 'tok-sign-in', role: 'provider' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns backend status failures for sign-up', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await signUpWithCredentials(
        { name: 'Marta Meister', email: 'marta@quickwerk.local', password: 'supersecure' },
        'http://localhost:3100',
      );
      expect(result).toMatchObject({ ok: false, error: 'Sign-up failed with HTTP 409.' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns session token on successful sign-up', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-sign-up' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await signUpWithCredentials(
        { name: 'Marta Meister', email: 'marta@quickwerk.local', password: 'supersecure' },
        'http://localhost:3100',
      );
      expect(result).toMatchObject({ ok: true, sessionToken: 'tok-sign-up', role: 'customer' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns an error when auth responses omit token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessionState: 'authenticated' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await signInWithCredentials(
        { email: 'customer@quickwerk.local', password: 'supersecure', role: 'customer' },
        'http://localhost:3100',
      );
      expect(result).toMatchObject({
        ok: false,
        error: 'Sign-in response did not include a session token.',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
