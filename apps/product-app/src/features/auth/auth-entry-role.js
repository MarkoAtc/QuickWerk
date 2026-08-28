export const authEntryRoles = Object.freeze({
  customer: 'customer',
  provider: 'provider',
});

export const authEntryRouteDefaults = Object.freeze({
  customer: authEntryRoles.customer,
  provider: authEntryRoles.provider,
});

export function resolveAuthEntryInitialRole(initialRole) {
  return initialRole === authEntryRoles.provider ? authEntryRoles.provider : authEntryRoles.customer;
}
