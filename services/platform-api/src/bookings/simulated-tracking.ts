export type SimulatedTracking = {
  source: 'simulated';
  status: 'en-route' | 'arrived';
  etaSeconds: number;
  distanceKm: number;
  startedAt: string;
};

const SIMULATED_TRIP_DURATION_SECONDS = 720; // 12 min, matches design/live_job_tracking's initial state
const SIMULATED_TRIP_DISTANCE_KM = 3.2; // matches design/live_job_tracking's initial state

/**
 * ponytail: no real GPS/geo subsystem exists in this codebase (see
 * docs/planning/14_Design-Mockup-Backend-Capability-Gaps-2026-08-20.md). This is a
 * deterministic, computed-on-read decay from a fixed anchor timestamp -- not a stored
 * counter -- so there is nothing to reset on reload/retry and no way for two concurrent
 * requests to disagree. Upgrade path: replace with a real provider-location feed if/when
 * one exists; callers only need `source` to change from 'simulated' to something else.
 */
export function computeSimulatedTracking(acceptedAt: string, now: Date): SimulatedTracking {
  const acceptedAtMs = new Date(acceptedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.min(SIMULATED_TRIP_DURATION_SECONDS, (now.getTime() - acceptedAtMs) / 1000));
  const etaSeconds = Math.round(SIMULATED_TRIP_DURATION_SECONDS - elapsedSeconds);
  const progress = etaSeconds / SIMULATED_TRIP_DURATION_SECONDS;
  const distanceKm = Math.round(SIMULATED_TRIP_DISTANCE_KM * progress * 100) / 100;

  return {
    source: 'simulated',
    status: etaSeconds > 0 ? 'en-route' : 'arrived',
    etaSeconds,
    distanceKm,
    startedAt: new Date(acceptedAtMs).toISOString(),
  };
}
