import { ProviderOnboardingState } from './onboarding-state';

export type ProviderProfileWorkspaceState = 'loading' | 'not-set' | 'ready' | 'saving' | 'saved' | 'error';

export type ProviderOnboardingWorkspaceFlow =
  | 'first-time-setup'
  | 'pending-review'
  | 'rejection-retry'
  | 'profile-saved'
  | 'approved'
  | 'active';

export function isProviderBookingAccessApproved(onboardingState: ProviderOnboardingState): boolean {
  return onboardingState.status === 'approved';
}

export function resolveProviderBookingGateMessage(onboardingState: ProviderOnboardingState): string | null {
  switch (onboardingState.status) {
    case 'approved':
      return null;
    case 'not-submitted':
      return 'Booking access is blocked until you submit verification.';
    case 'pending':
      return 'Booking access is blocked while verification is under review.';
    case 'request-more-info':
      return 'Booking access is blocked until requested verification updates are resubmitted.';
    case 'rejected':
      return 'Booking access is blocked until verification is resubmitted and approved.';
    case 'checking':
      return 'Checking verification status before opening booking access.';
    case 'submitting':
      return 'Booking access stays blocked while verification submission is in progress.';
    case 'error':
      return onboardingState.errorMessage;
    default:
      return 'Booking access is currently unavailable.';
  }
}

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

  if (onboardingState.status === 'rejected' || onboardingState.status === 'request-more-info') {
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
