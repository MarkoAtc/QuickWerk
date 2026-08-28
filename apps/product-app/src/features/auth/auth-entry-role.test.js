import { describe, expect, it } from 'vitest';

import { authEntryRoles, authEntryRouteDefaults, resolveAuthEntryInitialRole } from './auth-entry-role';

describe('resolveAuthEntryInitialRole', () => {
  it('preserves the reusable auth entry customer default', () => {
    expect(resolveAuthEntryInitialRole()).toBe(authEntryRoles.customer);
    expect(authEntryRouteDefaults.customer).toBe(authEntryRoles.customer);
  });

  it('accepts the provider route override', () => {
    expect(resolveAuthEntryInitialRole(authEntryRouteDefaults.provider)).toBe(authEntryRoles.provider);
  });

  it('fails closed to the customer role for unsupported values', () => {
    expect(resolveAuthEntryInitialRole('admin')).toBe(authEntryRoles.customer);
  });
});
