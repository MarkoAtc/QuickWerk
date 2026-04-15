import { ProviderOnboardingState } from './onboarding-state';

export type ProviderProfileWorkspaceState = 'loading' | 'not-set' | 'ready' | 'saving' | 'saved' | 'error';

export type ProviderOnboardingWorkspaceFlow =
  | 'first-time-setup'
  | 'pending-review'
  | 'rejection-retry'
  | 'profile-saved'
  | 'approved'
  | 'active';

export function resolveProviderOnboardingWorkspaceFlow(input: {
  onboardingState: ProviderOnboardingState;
  profileState: ProviderProfileWorkspaceState;
}): ProviderOnboardingWorkspaceFlow {
  const { onboardingState, profileState } = input;

  if (profileState === 'not-set' && onboardingState.status === 'not-submitted') {
    return 'first-time-setup';
  }

  if (onboardingState.status === 'pending') {
    return 'pending-review';
  }

  if (onboardingState.status === 'rejected') {
    return 'rejection-retry';
  }

  if (profileState === 'saved') {
    return 'profile-saved';
  }

  if (onboardingState.status === 'approved') {
    return 'approved';
  }

  return 'active';
}
