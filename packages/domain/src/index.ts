export const userRoles = [
  'customer',
  'provider-user',
  'provider-admin',
  'support-agent',
  'finance-user',
  'platform-admin',
] as const;

export const bookingStatuses = [
  'draft',
  'submitted',
  'broadcast',
  'accepted',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
] as const;

export const providerOnboardingSteps = [
  {
    id: 'account-setup',
    label: 'Create provider account',
  },
  {
    id: 'business-profile',
    label: 'Complete business profile',
  },
  {
    id: 'service-area',
    label: 'Set service area and trades',
  },
  {
    id: 'verification-documents',
    label: 'Upload verification documents',
  },
] as const;
