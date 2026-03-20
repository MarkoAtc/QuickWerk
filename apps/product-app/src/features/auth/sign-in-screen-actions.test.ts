import { describe, expect, it } from 'vitest';

import { createSignInFormState } from './sign-in-screen-actions';

describe('createSignInFormState', () => {
  it('returns session token on successful sign-in', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ token: 'tok-abc123', sessionState: 'authenticated' }),
      }) as Response;

    const result = await createSignInFormState(
      { email: 'customer@quickwerk.local', role: 'customer' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ sessionToken: 'tok-abc123' });
    expect(result.errorMessage).toBeUndefined();
  });

  it('returns error message on non-OK response', async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        status: 401,
      }) as Response;

    const result = await createSignInFormState(
      { email: 'customer@quickwerk.local', role: 'customer' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Sign-in failed with HTTP 401.' });
    expect(result.sessionToken).toBeUndefined();
  });

  it('returns error message when token is missing from response', async () => {
    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({ sessionState: 'authenticated' }),
      }) as Response;

    const result = await createSignInFormState(
      { email: 'customer@quickwerk.local', role: 'customer' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'Sign-in response did not include a session token.' });
    expect(result.sessionToken).toBeUndefined();
  });

  it('returns error message when fetch throws', async () => {
    const fetchMock = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3101');
    };

    const result = await createSignInFormState(
      { email: 'customer@quickwerk.local', role: 'customer' },
      fetchMock as typeof fetch,
    );

    expect(result).toMatchObject({ errorMessage: 'connect ECONNREFUSED 127.0.0.1:3101' });
    expect(result.sessionToken).toBeUndefined();
  });
});
