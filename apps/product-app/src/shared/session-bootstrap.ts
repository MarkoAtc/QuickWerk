import { createSessionBootstrapRequest, createSignInRequest, type SignInRequestBody } from '@quickwerk/api-client';
import { authBoundaries, authFlowSteps, sessionStates } from '@quickwerk/auth';

import { productAppShell } from './app-shell';

type SessionState = (typeof sessionStates)[number];
type PublicAuthRoute = (typeof authBoundaries.publicRoutes)[number];

type SessionBootstrapPayload = {
  availableActions?: string[];
  nextStep?: string;
  sessionState?: string;
};

type SignInPayload = {
  token?: string;
};

export type SessionBootstrapResult = {
  availableActions: readonly PublicAuthRoute[];
  errorMessage?: string;
  nextStep: (typeof authFlowSteps)[number];
  sessionState: SessionState;
  source: 'fallback' | 'platform-api';
};

export type SignInResult = {
  errorMessage?: string;
  sessionBootstrap: SessionBootstrapResult;
  sessionToken?: string;
};

export const defaultSessionBootstrap = {
  availableActions: productAppShell.publicAuthRoutes,
  nextStep: productAppShell.authEntryStep,
  sessionState: productAppShell.sessionState,
  source: 'fallback',
} as const satisfies SessionBootstrapResult;

const isSessionState = (value: string): value is SessionState => sessionStates.some((state) => state === value);

const isPublicAuthRoute = (value: string): value is PublicAuthRoute =>
  authBoundaries.publicRoutes.some((route) => route === value);

const resolveSessionState = (sessionState: string | undefined): SessionState => {
  if (sessionState && isSessionState(sessionState)) {
    return sessionState;
  }

  return productAppShell.sessionState;
};

const resolveAuthFlowStep = (nextStep: string | undefined) =>
  authFlowSteps.find((step) => step.id === nextStep) ?? productAppShell.authEntryStep;

const resolveAvailableActions = (availableActions: string[] | undefined) => {
  const nextActions = availableActions?.filter((action): action is PublicAuthRoute => isPublicAuthRoute(action)) ?? [];

  return nextActions.length > 0 ? nextActions : productAppShell.publicAuthRoutes;
};

const createSessionBootstrapUrl = () => `${productAppShell.sessionBootstrapBaseUrl}${productAppShell.sessionBootstrapRoute}`;

const sanitizeBootstrapPayload = (payload: SessionBootstrapPayload): SessionBootstrapResult => ({
  availableActions: resolveAvailableActions(payload.availableActions),
  nextStep: resolveAuthFlowStep(payload.nextStep),
  sessionState: resolveSessionState(payload.sessionState),
  source: 'platform-api',
});

export async function loadSessionBootstrap(
  fetchImpl: typeof fetch = fetch,
  options?: { sessionToken?: string },
): Promise<SessionBootstrapResult> {
  const request = createSessionBootstrapRequest(options?.sessionToken);

  try {
    const response = await fetchImpl(createSessionBootstrapUrl(), {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return {
        ...defaultSessionBootstrap,
        errorMessage: `Session bootstrap request failed with HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as SessionBootstrapPayload;

    return sanitizeBootstrapPayload(payload);
  } catch (error) {
    return {
      ...defaultSessionBootstrap,
      errorMessage: error instanceof Error ? error.message : 'Unknown session bootstrap failure.',
    };
  }
}

export async function signInWithSessionBootstrap(
  fetchImpl: typeof fetch = fetch,
  signIn: SignInRequestBody = { email: 'customer.demo@quickwerk.local', role: 'customer' },
): Promise<SignInResult> {
  const request = createSignInRequest(signIn);

  try {
    const response = await fetchImpl(`${productAppShell.sessionBootstrapBaseUrl}${request.path}`, {
      method: request.method,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      return {
        sessionBootstrap: defaultSessionBootstrap,
        errorMessage: `Sign-in request failed with HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as SignInPayload & SessionBootstrapPayload;
    const sessionToken = payload.token;

    if (!sessionToken) {
      return {
        sessionBootstrap: defaultSessionBootstrap,
        errorMessage: 'Sign-in response did not include a session token.',
      };
    }

    const sessionBootstrap = await loadSessionBootstrap(fetchImpl, { sessionToken });
    const resolvedSessionBootstrap =
      sessionBootstrap.sessionState === 'authenticated'
        ? sessionBootstrap
        : {
            ...sessionBootstrap,
            sessionState: 'authenticated' as const,
            source: 'platform-api' as const,
          };

    return {
      sessionBootstrap: resolvedSessionBootstrap,
      sessionToken,
      errorMessage: sessionBootstrap.errorMessage
        ? `Sign-in succeeded but bootstrap refresh failed: ${sessionBootstrap.errorMessage}`
        : undefined,
    };
  } catch (error) {
    return {
      sessionBootstrap: defaultSessionBootstrap,
      errorMessage: error instanceof Error ? error.message : 'Unknown sign-in failure.',
    };
  }
}
