import { describe, expect, it } from 'vitest';

import { createAuthEntryState, initialAuthEntryState } from './auth-entry-state';
import type { SessionBootstrapResult } from '../../shared/session-bootstrap';

describe('createAuthEntryState', () => {
  it('returns the initial auth entry state while session bootstrap is loading', () => {
    const state = createAuthEntryState(
      {
        availableActions: ['sign-in', 'sign-up', 'password-reset'],
        nextStep: {
          id: 'sign-in',
          label: 'Sign in',
        },
        sessionState: 'anonymous',
        source: 'fallback',
      } as const satisfies SessionBootstrapResult,
      true,
    );

    expect(state).toBe(initialAuthEntryState);
  });

  it('maps anonymous bootstrap results to the next auth action state', () => {
    const sessionBootstrap = {
      availableActions: ['sign-in', 'sign-up', 'password-reset'],
      errorMessage: 'Session bootstrap request failed with HTTP 503.',
      nextStep: {
        id: 'sign-up',
        label: 'Create account',
      },
      sessionState: 'anonymous',
      source: 'fallback',
    } as const satisfies SessionBootstrapResult;

    const state = createAuthEntryState(sessionBootstrap, false);

    expect(state).toMatchObject({
      availableActions: sessionBootstrap.availableActions,
      errorMessage: sessionBootstrap.errorMessage,
      helperText: 'Start with Create account to unlock the first shared onboarding step.',
      isLoading: false,
      primaryActionId: 'sign-up',
      primaryActionLabel: 'Create account',
      primaryStatus: 'Anonymous session bootstrap',
      recommendedOnboardingStep: 'Create provider account',
      sessionState: 'anonymous',
      source: 'fallback',
    });
  });

  it('maps authenticated bootstrap results to a marketplace continuation state', () => {
    const sessionBootstrap = {
      availableActions: ['sign-in', 'sign-up', 'password-reset'],
      nextStep: {
        id: 'sign-in',
        label: 'Sign in',
      },
      sessionState: 'authenticated',
      source: 'platform-api',
    } as const satisfies SessionBootstrapResult;

    const state = createAuthEntryState(sessionBootstrap, false);

    expect(state).toMatchObject({
      availableActions: sessionBootstrap.availableActions,
      helperText: expect.stringContaining('booking and profile flow'),
      isLoading: false,
      primaryActionId: 'continue-to-marketplace',
      primaryActionLabel: 'Continue to marketplace',
      primaryStatus: 'Authenticated session ready',
      recommendedOnboardingStep: 'Complete business profile',
      sessionState: 'authenticated',
      source: 'platform-api',
    });
  });
});