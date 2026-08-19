import { describe, expect, it, vi } from 'vitest';

import { requestOtp, verifyOtp } from './auth-otp-actions';

describe('auth-otp-actions', () => {
  it('returns expiry and dev code on successful otp request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ expiresAt: '2026-08-19T00:05:00.000Z', devOtpCode: '123456' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await requestOtp({ phone: '+15550001234' }, 'http://localhost:3100');
      expect(result).toMatchObject({
        ok: true,
        expiresAt: '2026-08-19T00:05:00.000Z',
        devOtpCode: '123456',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns backend status failures for otp request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await requestOtp({ phone: 'bad-phone' }, 'http://localhost:3100');
      expect(result).toMatchObject({ ok: false, error: 'Send code failed with HTTP 400.' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns session token on successful otp verification', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-otp-verify' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await verifyOtp({ phone: '+15550001234', code: '123456', role: 'customer' }, 'http://localhost:3100');
      expect(result).toMatchObject({ ok: true, sessionToken: 'tok-otp-verify', role: 'customer' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns an error when verify responses omit a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessionState: 'authenticated' }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const result = await verifyOtp({ phone: '+15550001234', code: '000000' }, 'http://localhost:3100');
      expect(result).toMatchObject({
        ok: false,
        error: 'Verification response did not include a session token.',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
