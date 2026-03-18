import { providerOnboardingSteps } from '@quickwerk/domain';

import { defaultSessionBootstrap, type SessionBootstrapResult } from '../../shared/session-bootstrap';

export type AuthEntryState = {
  availableActions: readonly string[];
  errorMessage?: string;
  helperText: string;
  isLoading: boolean;
  primaryActionId: string;
  primaryActionLabel: string;
  primaryStatus: string;
  recommendedOnboardingStep: string;
  sessionState: SessionBootstrapResult['sessionState'];
  source: SessionBootstrapResult['source'];
};

export const initialAuthEntryState = {
  availableActions: defaultSessionBootstrap.availableActions,
  helperText: 'Checking your session bootstrap against the shared auth boundary.',
  isLoading: true,
  primaryActionId: defaultSessionBootstrap.nextStep.id,
  primaryActionLabel: defaultSessionBootstrap.nextStep.label,
  primaryStatus: 'Checking session…',
  recommendedOnboardingStep: providerOnboardingSteps[0].label,
  sessionState: defaultSessionBootstrap.sessionState,
  source: defaultSessionBootstrap.source,
} as const satisfies AuthEntryState;

export const createAuthEntryState = (
  sessionBootstrap: SessionBootstrapResult,
  isLoading: boolean,
): AuthEntryState => {
  if (isLoading) {
    return initialAuthEntryState;
  }

  if (sessionBootstrap.sessionState === 'authenticated') {
    return {
      availableActions: sessionBootstrap.availableActions,
      helperText: 'Your shared session is ready; the next step is to enter the booking and profile flow.',
      isLoading: false,
      primaryActionId: 'continue-to-marketplace',
      primaryActionLabel: 'Continue to marketplace',
      primaryStatus: 'Authenticated session ready',
      recommendedOnboardingStep: providerOnboardingSteps[1]?.label ?? providerOnboardingSteps[0].label,
      sessionState: sessionBootstrap.sessionState,
      source: sessionBootstrap.source,
    };
  }

  return {
    availableActions: sessionBootstrap.availableActions,
    errorMessage: sessionBootstrap.errorMessage,
    helperText: `Start with ${sessionBootstrap.nextStep.label} to unlock the first shared onboarding step.`,
    isLoading: false,
    primaryActionId: sessionBootstrap.nextStep.id,
    primaryActionLabel: sessionBootstrap.nextStep.label,
    primaryStatus: 'Anonymous session bootstrap',
    recommendedOnboardingStep: providerOnboardingSteps[0].label,
    sessionState: sessionBootstrap.sessionState,
    source: sessionBootstrap.source,
  };
};