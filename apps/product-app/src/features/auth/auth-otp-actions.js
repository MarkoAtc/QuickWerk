import { createOtpRequestRequest, createOtpVerifyRequest } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

export async function requestOtp({ phone }, sessionApiBase) {
  const request = createOtpRequestRequest({ phone });
  return runOtpRequest(request, 'Send code', (payload) => ({
    ok: true,
    expiresAt: payload.expiresAt,
    devOtpCode: payload.devOtpCode,
  }), sessionApiBase);
}

export async function verifyOtp({ phone, code }, sessionApiBase) {
  const request = createOtpVerifyRequest({ phone, code });
  return runOtpRequest(request, 'Verification', (payload) => {
    if (!payload.token) {
      return { ok: false, error: 'Verification response did not include a session token.' };
    }
    return { ok: true, sessionToken: payload.token, role: payload.role ?? 'customer' };
  }, sessionApiBase);
}

export async function createLocalBrowserTestSession(sessionApiBase) {
  const baseUrl = sessionApiBase ?? runtimeConfig.platformApiBaseUrl;

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/local-browser-test-session`, { method: 'POST' });
    if (!response.ok) return { ok: false, error: await extractErrorMessage(response, 'Local browser authentication') };
    const payload = await response.json();
    if (!payload.token || payload.session?.role !== 'customer') return { ok: false, error: 'Local browser fixture returned an invalid session.' };
    return { ok: true, sessionToken: payload.token, role: 'customer' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Local browser authentication failed.' };
  }
}

async function runOtpRequest(request, failurePrefix, onSuccess, sessionApiBase) {
  const baseUrl = sessionApiBase ?? runtimeConfig.platformApiBaseUrl;

  try {
    const response = await fetch(`${baseUrl}${request.path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { ok: false, error: await extractErrorMessage(response, failurePrefix) };
    }

    const payload = await response.json();
    return onSuccess(payload);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `Unknown ${failurePrefix.toLowerCase()} failure.`,
    };
  }
}

async function extractErrorMessage(response, failurePrefix) {
  const fallback = `${failurePrefix} failed with HTTP ${response.status}.`;

  try {
    const body = await response.json();
    return typeof body?.message === 'string' && body.message.trim() ? body.message : fallback;
  } catch {
    return fallback;
  }
}
