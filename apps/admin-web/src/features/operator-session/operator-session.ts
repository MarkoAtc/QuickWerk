const PLATFORM_API_BASE_URL =
  typeof process !== 'undefined'
    ? (process.env['NEXT_PUBLIC_PLATFORM_API_BASE_URL'] ?? 'http://127.0.0.1:3101')
    : 'http://127.0.0.1:3101';

export type ResolvedOperatorSession =
  | {
      ok: true;
      sessionToken: string;
      operatorEmail: string;
      operatorUserId: string;
      source: 'env-token' | 'bootstrap-sign-in';
    }
  | {
      ok: false;
      errorMessage: string;
    };

type SessionPayload = {
  sessionState?: string;
  session?: {
    userId?: string;
    email?: string;
    role?: string;
  };
};

type SignInPayload = SessionPayload & {
  token?: string;
};

const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const session = payload['session'];

  return (
    typeof payload['sessionState'] === 'string' &&
    (!session ||
      (typeof session === 'object' &&
        typeof (session as Record<string, unknown>)['userId'] === 'string' &&
        typeof (session as Record<string, unknown>)['email'] === 'string' &&
        typeof (session as Record<string, unknown>)['role'] === 'string'))
  );
};

const isSignInPayload = (value: unknown): value is SignInPayload => {
  if (!isSessionPayload(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload['token'] === 'string';
};

async function validateOperatorSessionToken(
  sessionToken: string,
  fetchImpl: typeof fetch,
): Promise<ResolvedOperatorSession> {
  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}/api/v1/auth/session`, {
      method: 'GET',
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        errorMessage: `Admin session bootstrap failed: auth/session returned HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as unknown;
    if (!isSessionPayload(payload)) {
      return {
        ok: false,
        errorMessage: 'Admin session bootstrap failed: unexpected auth/session response.',
      };
    }

    if (payload.sessionState !== 'authenticated' || payload.session?.role !== 'operator') {
      return {
        ok: false,
        errorMessage: 'Admin session token is missing operator access.',
      };
    }

    return {
      ok: true,
      sessionToken,
      operatorEmail: payload.session.email ?? 'operator@quickwerk.local',
      operatorUserId: payload.session.userId ?? 'operator-missing',
      source: 'env-token',
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error validating admin session token.',
    };
  }
}

async function signInOperatorViaBootstrapEmail(
  email: string,
  fetchImpl: typeof fetch,
): Promise<ResolvedOperatorSession> {
  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE_URL}/api/v1/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'operator' }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        errorMessage: `Admin bootstrap sign-in failed: HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as unknown;
    if (!isSignInPayload(payload)) {
      return {
        ok: false,
        errorMessage: 'Admin bootstrap sign-in failed: unexpected response.',
      };
    }

    if (payload.sessionState !== 'authenticated' || payload.session?.role !== 'operator') {
      return {
        ok: false,
        errorMessage: 'Bootstrap sign-in did not return operator access.',
      };
    }

    const sessionToken = payload.token;
    if (typeof sessionToken !== 'string') {
      return {
        ok: false,
        errorMessage: 'Admin bootstrap sign-in failed: response token missing.',
      };
    }

    return {
      ok: true,
      sessionToken,
      operatorEmail: payload.session.email ?? email,
      operatorUserId: payload.session.userId ?? 'operator-missing',
      source: 'bootstrap-sign-in',
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error bootstrapping admin session.',
    };
  }
}

export async function resolveOperatorSession(fetchImpl: typeof fetch = fetch): Promise<ResolvedOperatorSession> {
  const envToken = process.env['QUICKWERK_ADMIN_SESSION_TOKEN']?.trim();
  if (envToken) {
    return validateOperatorSessionToken(envToken, fetchImpl);
  }

  const bootstrapEmail = process.env['QUICKWERK_ADMIN_BOOTSTRAP_EMAIL']?.trim();
  if (bootstrapEmail) {
    return signInOperatorViaBootstrapEmail(bootstrapEmail, fetchImpl);
  }

  return {
    ok: false,
    errorMessage:
      'Missing admin session bootstrap. Set QUICKWERK_ADMIN_SESSION_TOKEN or QUICKWERK_ADMIN_BOOTSTRAP_EMAIL.',
  };
}
