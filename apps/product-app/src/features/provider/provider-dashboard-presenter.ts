type ProviderIdentity = { displayName?: string } | null | undefined;

export function getProviderDisplayName(profile: ProviderIdentity): string {
  return profile?.displayName?.trim() || 'Provider';
}

export function getProviderInitial(profile: ProviderIdentity): string {
  return getProviderDisplayName(profile).charAt(0).toUpperCase() || 'P';
}

export function getProviderProfileLabel(profile: ProviderIdentity): 'Ready' | 'Set up' {
  return profile?.displayName?.trim() ? 'Ready' : 'Set up';
}

export function formatProviderRequestTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return 'Recently submitted';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date);
}
