export const authBoundaries = {
  publicRoutes: ['sign-in', 'sign-up', 'password-reset'],
  protectedRoles: ['customer', 'provider-user', 'provider-admin', 'support-agent'],
} as const;

export const sessionStates = ['anonymous', 'authenticated', 'verification-pending'] as const;

export const authFlowSteps = [
  {
    id: 'sign-in',
    label: 'Sign in',
  },
  {
    id: 'sign-up',
    label: 'Create account',
  },
  {
    id: 'password-reset',
    label: 'Recover access',
  },
] as const;
