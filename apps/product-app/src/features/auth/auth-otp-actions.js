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

export async function verifyOtp({ phone, code, role }, sessionApiBase) {
  const request = createOtpVerifyRequest({ phone, code, role });
  return runOtpRequest(request, 'Verification', (payload) => {
    if (!payload.token) {
      return { ok: false, error: 'Verification response did not include a session token.' };
    }
    return { ok: true, sessionToken: payload.token, role: payload.role ?? role ?? 'customer' };
  }, sessionApiBase);
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
      return { ok: false, error: `${failurePrefix} failed with HTTP ${response.status}.` };
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
