import type { SessionRole } from '../auth/domain/auth-session.repository';

export type OperatorAccessPolicy = {
  authMode: 'required' | 'legacy-open';
  allowedRoles: SessionRole[];
};

const sessionRoles: SessionRole[] = ['customer', 'provider'];

export function resolveOperatorAccessPolicy(env: NodeJS.ProcessEnv): OperatorAccessPolicy {
  const authModeRaw = env.BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE?.trim().toLowerCase();
  const authMode = authModeRaw === 'legacy-open' ? 'legacy-open' : 'required';

  const allowedRolesRaw = env.BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES?.trim();
  const requestedRoles = allowedRolesRaw
    ? allowedRolesRaw
        .split(',')
        .map((role) => role.trim().toLowerCase())
        .filter((role) => role.length > 0)
    : ['provider'];

  const normalizedRoles = [...new Set(requestedRoles)].filter((role): role is SessionRole =>
    sessionRoles.includes(role as SessionRole),
  );

  return {
    authMode,
    allowedRoles: normalizedRoles.length > 0 ? normalizedRoles : ['provider'],
  };
}
