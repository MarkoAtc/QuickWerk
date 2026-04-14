import { createSignInRequest, createSignUpRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export async function signInWithCredentials({ email, password, role }, sessionApiBase) {
  const request = createSignInRequest({ email, password, role });
  return runAuthRequest(
    request,
    {
      failurePrefix: 'Sign-in',
      unknownFailureMessage: 'Unknown sign-in failure.',
      fallbackRole: role,
    },
    sessionApiBase,
  );
}

export async function signUpWithCredentials({ name, email, password }, sessionApiBase) {
  const request = createSignUpRequest({ name, email, password });
  return runAuthRequest(
    request,
    {
      failurePrefix: 'Sign-up',
      unknownFailureMessage: 'Unknown sign-up failure.',
      fallbackRole: 'customer',
    },
    sessionApiBase,
  );
}

async function runAuthRequest(request, options, sessionApiBase) {
  const baseUrl = sessionApiBase ?? runtimeConfig.platformApiBaseUrl;

  try {
    const response = await fetch(`${baseUrl}${request.path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { ok: false, error: `${options.failurePrefix} failed with HTTP ${response.status}.` };
    }

    const payload = await response.json();

    if (!payload.token) {
      return { ok: false, error: `${options.failurePrefix} response did not include a session token.` };
    }

    return { ok: true, sessionToken: payload.token, role: payload.role ?? options.fallbackRole };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : options.unknownFailureMessage,
    };
  }
}
