export const DEFAULT_AUTH_SESSION_TTL_SECONDS = 60 * 60 * 12;

export function resolveAuthSessionTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.AUTH_SESSION_TTL_SECONDS;

  if (!raw) {
    return DEFAULT_AUTH_SESSION_TTL_SECONDS;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_AUTH_SESSION_TTL_SECONDS;
  }

  return parsed;
}

export function computeSessionExpiryIso(createdAtIso: string, ttlSeconds: number): string {
  return new Date(new Date(createdAtIso).getTime() + ttlSeconds * 1000).toISOString();
}

export function isSessionExpired(expiresAtIso: string, now = Date.now()): boolean {
  return new Date(expiresAtIso).getTime() <= now;
}
