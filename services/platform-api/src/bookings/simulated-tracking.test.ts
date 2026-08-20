import { describe, expect, it } from 'vitest';

import { computeSimulatedTracking } from './simulated-tracking';

const ACCEPTED_AT = '2026-01-01T12:00:00.000Z';

describe('computeSimulatedTracking', () => {
  it('returns the full trip at elapsed=0', () => {
    const result = computeSimulatedTracking(ACCEPTED_AT, new Date(ACCEPTED_AT));

    expect(result).toEqual({
      source: 'simulated',
      status: 'en-route',
      etaSeconds: 720,
      distanceKm: 3.2,
      startedAt: ACCEPTED_AT,
    });
  });

  it('decays linearly at the midpoint', () => {
    const midpoint = new Date(new Date(ACCEPTED_AT).getTime() + 360_000);
    const result = computeSimulatedTracking(ACCEPTED_AT, midpoint);

    expect(result.status).toBe('en-route');
    expect(result.etaSeconds).toBe(360);
    expect(result.distanceKm).toBe(1.6);
  });

  it('reaches arrived exactly at the trip duration', () => {
    const end = new Date(new Date(ACCEPTED_AT).getTime() + 720_000);
    const result = computeSimulatedTracking(ACCEPTED_AT, end);

    expect(result.status).toBe('arrived');
    expect(result.etaSeconds).toBe(0);
    expect(result.distanceKm).toBe(0);
  });

  it('clamps at arrived when queried well past the trip duration', () => {
    const wayLater = new Date(new Date(ACCEPTED_AT).getTime() + 3_600_000);
    const result = computeSimulatedTracking(ACCEPTED_AT, wayLater);

    expect(result.status).toBe('arrived');
    expect(result.etaSeconds).toBe(0);
    expect(result.distanceKm).toBe(0);
  });

  it('is deterministic: two calls at the same instant return identical values', () => {
    const now = new Date(new Date(ACCEPTED_AT).getTime() + 123_000);

    const first = computeSimulatedTracking(ACCEPTED_AT, now);
    const second = computeSimulatedTracking(ACCEPTED_AT, now);

    expect(first).toEqual(second);
  });

  it('strictly decreases as time advances (no reset)', () => {
    const t1 = new Date(new Date(ACCEPTED_AT).getTime() + 100_000);
    const t2 = new Date(new Date(ACCEPTED_AT).getTime() + 200_000);

    const first = computeSimulatedTracking(ACCEPTED_AT, t1);
    const second = computeSimulatedTracking(ACCEPTED_AT, t2);

    expect(second.etaSeconds).toBeLessThan(first.etaSeconds);
    expect(second.distanceKm).toBeLessThan(first.distanceKm);
  });

  it('always tags the response as simulated', () => {
    const result = computeSimulatedTracking(ACCEPTED_AT, new Date(ACCEPTED_AT));
    expect(result.source).toBe('simulated');
  });
});
