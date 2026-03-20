import { describe, expect, it } from 'vitest';

import { normalizeCorrelationId, resolveCorrelationId } from './correlation-id';

describe('correlation-id', () => {
  it('uses normalized header value when provided', () => {
    expect(normalizeCorrelationId('  req-123_X  ')).toBe('req-123_X');
    expect(
      resolveCorrelationId({
        headerValue: 'req-123_X',
        method: 'post',
        path: '/api/v1/auth/sign-in',
      }),
    ).toBe('req-123_X');
  });

  it('rejects invalid header values and falls back deterministically', () => {
    expect(normalizeCorrelationId('request id with spaces')).toBeNull();

    const first = resolveCorrelationId({
      headerValue: 'request id with spaces',
      method: 'POST',
      path: '/api/v1/bookings',
      token: 'token-a',
      body: {
        requestedService: 'Plumbing',
      },
    });

    const second = resolveCorrelationId({
      headerValue: undefined,
      method: 'POST',
      path: '/api/v1/bookings',
      token: 'token-a',
      body: {
        requestedService: 'Plumbing',
      },
    });

    const third = resolveCorrelationId({
      headerValue: undefined,
      method: 'POST',
      path: '/api/v1/bookings',
      token: 'token-b',
      body: {
        requestedService: 'Plumbing',
      },
    });

    expect(first).toMatch(/^corr-[a-f0-9]{24}$/);
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
