import type { SessionRole } from '../auth/domain/auth-session.repository';

export type OperatorAccessPolicy = {
  authMode: 'required' | 'legacy-open';
  allowedRoles: SessionRole[];
  roleMode: 'operator-strict' | 'operator-provider-transition';
};

const sessionRoles: SessionRole[] = ['customer', 'provider', 'operator'];

export function resolveOperatorAccessPolicy(env: NodeJS.ProcessEnv): OperatorAccessPolicy {
  const authModeRaw = env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE?.trim().toLowerCase();
  const authMode = authModeRaw === 'legacy-open' ? 'legacy-open' : 'required';

  const roleModeRaw = env.BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE?.trim().toLowerCase();
  const roleMode = roleModeRaw === 'operator-strict' ? 'operator-strict' : 'operator-provider-transition';

  const allowedRolesRaw = env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES?.trim();
  const requestedRoles = allowedRolesRaw
    ? allowedRolesRaw
        .split(',')
        .map((role) => role.trim().toLowerCase())
        .filter((role) => role.length > 0)
    : roleMode === 'operator-strict'
      ? ['operator']
      : ['operator', 'provider'];

  const normalizedRoles = [...new Set(requestedRoles)].filter((role): role is SessionRole =>
    sessionRoles.includes(role as SessionRole),
  );

  const fallbackAllowedRoles: SessionRole[] =
    roleMode === 'operator-strict' ? ['operator'] : ['operator', 'provider'];

  return {
    authMode,
    allowedRoles: normalizedRoles.length > 0 ? normalizedRoles : fallbackAllowedRoles,
    roleMode,
  };
}
