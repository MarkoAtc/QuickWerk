import { authBoundaries, authFlowSteps, sessionStates } from '@quickwerk/auth';

import { productAppShell } from './app-shell';

type SessionState = (typeof sessionStates)[number];
type PublicAuthRoute = (typeof authBoundaries.publicRoutes)[number];

type SessionBootstrapPayload = {
  availableActions?: string[];
  nextStep?: string;
  sessionState?: string;
};

export type SessionBootstrapResult = {
  availableActions: readonly PublicAuthRoute[];
  errorMessage?: string;
  nextStep: (typeof authFlowSteps)[number];
  sessionState: SessionState;
  source: 'fallback' | 'platform-api';
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

const createSessionBootstrapUrl = () =>
  `${productAppShell.sessionBootstrapBaseUrl}${productAppShell.sessionBootstrapRequest.path}`;

export async function loadSessionBootstrap(fetchImpl: typeof fetch = fetch): Promise<SessionBootstrapResult> {
  try {
    const response = await fetchImpl(createSessionBootstrapUrl(), {
      method: productAppShell.sessionBootstrapRequest.method,
    });

    if (!response.ok) {
      return {
        ...defaultSessionBootstrap,
        errorMessage: `Session bootstrap request failed with HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as SessionBootstrapPayload;

    return {
      availableActions: resolveAvailableActions(payload.availableActions),
      nextStep: resolveAuthFlowStep(payload.nextStep),
      sessionState: resolveSessionState(payload.sessionState),
      source: 'platform-api',
    };
  } catch (error) {
    return {
      ...defaultSessionBootstrap,
      errorMessage: error instanceof Error ? error.message : 'Unknown session bootstrap failure.',
    };
  }
}