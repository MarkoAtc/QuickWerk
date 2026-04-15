import { describe, expect, it } from 'vitest';

import {
  resolveProviderOnboardingWorkspaceFlow,
} from './provider-onboarding-workspace-state';

const baseVerification = {
  verificationId: 'ver-1',
  status: 'pending' as const,
  submittedAt: '2026-04-10T08:00:00.000Z',
  tradeCategories: ['plumbing'],
  documents: [],
};

describe('resolveProviderOnboardingWorkspaceFlow', () => {
  it('returns first-time-setup when profile is not-set and verification is not submitted', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'not-set',
      onboardingState: { status: 'not-submitted' },
    });

    expect(flow).toBe('first-time-setup');
  });

  it('returns pending-review when verification is pending', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'ready',
      onboardingState: { status: 'pending', verification: baseVerification },
    });

    expect(flow).toBe('pending-review');
  });

  it('returns rejection-retry when verification is rejected', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'ready',
      onboardingState: {
        status: 'rejected',
        verification: { ...baseVerification, status: 'rejected' },
      },
    });

    expect(flow).toBe('rejection-retry');
  });

  it('returns profile-saved after profile save transition', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'saved',
      onboardingState: { status: 'not-submitted' },
    });

    expect(flow).toBe('profile-saved');
  });
});
