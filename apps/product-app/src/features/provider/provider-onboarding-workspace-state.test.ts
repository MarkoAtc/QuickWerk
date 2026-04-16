import { describe, expect, it } from 'vitest';

import {
  isProviderBookingAccessApproved,
  resolveProviderBookingGateMessage,
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

  it('returns rejection-retry when verification needs more info', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'ready',
      onboardingState: {
        status: 'request-more-info',
        verification: { ...baseVerification, status: 'request-more-info' },
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

  it('returns approved when verification is approved', () => {
    const flow = resolveProviderOnboardingWorkspaceFlow({
      profileState: 'ready',
      onboardingState: {
        status: 'approved',
        verification: { ...baseVerification, status: 'approved' },
      },
    });

    expect(flow).toBe('approved');
  });
});

describe('provider booking access gate helpers', () => {
  it('allows booking access only for approved status', () => {
    expect(
      isProviderBookingAccessApproved({
        status: 'approved',
        verification: { ...baseVerification, status: 'approved' },
      }),
    ).toBe(true);
    expect(isProviderBookingAccessApproved({ status: 'not-submitted' })).toBe(false);
    expect(
      isProviderBookingAccessApproved({
        status: 'pending',
        verification: baseVerification,
      }),
    ).toBe(false);
  });

  it('returns bounded guidance message for blocked states', () => {
    expect(resolveProviderBookingGateMessage({ status: 'not-submitted' })).toContain('submit verification');
    expect(
      resolveProviderBookingGateMessage({
        status: 'request-more-info',
        verification: { ...baseVerification, status: 'request-more-info' },
      }),
    ).toContain('resubmitted');
    expect(
      resolveProviderBookingGateMessage({
        status: 'rejected',
        verification: { ...baseVerification, status: 'rejected' },
      }),
    ).toContain('resubmitted');
  });
});
