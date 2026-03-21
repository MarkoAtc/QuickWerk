import { describe, expect, it } from 'vitest';

import { resolveOperatorAccessPolicy } from './operator-access-policy';

describe('resolveOperatorAccessPolicy', () => {
  it('defaults to operator/provider transition for backward-safe migration', () => {
    const policy = resolveOperatorAccessPolicy({});

    expect(policy).toEqual({
      authMode: 'required',
      roleMode: 'operator-provider-transition',
      allowedRoles: ['operator', 'provider'],
    });
  });

  it('supports strict operator-only mode once provider fallback is removed', () => {
    const policy = resolveOperatorAccessPolicy({
      BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE: 'operator-strict',
    });

    expect(policy).toEqual({
      authMode: 'required',
      roleMode: 'operator-strict',
      allowedRoles: ['operator'],
    });
  });

  it('keeps explicit allowed-role overrides for staged rollouts', () => {
    const policy = resolveOperatorAccessPolicy({
      BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE: 'operator-strict',
      BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES: 'provider,operator,unknown',
    });

    expect(policy).toEqual({
      authMode: 'required',
      roleMode: 'operator-strict',
      allowedRoles: ['provider', 'operator'],
    });
  });
});
