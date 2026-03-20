import { createSignInRequest } from '@quickwerk/api-client';
import type { SessionRole } from '@quickwerk/api-client';

import { runtimeConfig } from '../../shared/runtime-config';

type SignInInput = {
  email: string;
  role: SessionRole;
};

type SignInActionResult =
  | { sessionToken: string; errorMessage?: undefined }
  | { sessionToken?: undefined; errorMessage: string };

export async function createSignInFormState(
  input: SignInInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SignInActionResult> {
  const request = createSignInRequest({ email: input.email, role: input.role });

  try {
    const response = await fetchImpl(`${runtimeConfig.platformApiBaseUrl}${request.path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return { errorMessage: `Sign-in failed with HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as { token?: string };

    if (!payload.token) {
      return { errorMessage: 'Sign-in response did not include a session token.' };
    }

    return { sessionToken: payload.token };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : 'Unknown sign-in failure.',
    };
  }
}
