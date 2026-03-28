import { runtimeConfig } from '../../shared/runtime-config';

export async function signInWithCredentials({ email, password, role }, sessionApiBase) {
  const baseUrl = sessionApiBase ?? runtimeConfig.platformApiBaseUrl;

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      return { ok: false, error: `Sign-in failed with HTTP ${response.status}.` };
    }

    const payload = await response.json();

    if (!payload.token) {
      return { ok: false, error: 'Sign-in response did not include a session token.' };
    }

    return { ok: true, sessionToken: payload.token, role: payload.role ?? role };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown sign-in failure.' };
  }
}
