import { authBoundaries, authFlowSteps, sessionStates } from '@quickwerk/auth';
import { bookingStatuses, providerOnboardingSteps, userRoles } from '@quickwerk/domain';
import { designTokens } from '@quickwerk/ui';

export const productAppShell = {
  appName: 'QuickWerk',
  deliveryMode: 'cross-platform-first',
  supportedPlatforms: ['web', 'ios', 'android'],
  sharedAreas: ['auth', 'marketplace', 'booking', 'profile'],
  onboardingRoles: userRoles,
  onboardingSteps: providerOnboardingSteps,
  sessionState: sessionStates[0],
  authEntryStep: authFlowSteps[0],
  publicAuthRoutes: authBoundaries.publicRoutes,
  initialBookingStatus: bookingStatuses[0],
  theme: designTokens,
  platformSpecificModules: ['platform/web.ts', 'platform/native.ts'],
} as const;
