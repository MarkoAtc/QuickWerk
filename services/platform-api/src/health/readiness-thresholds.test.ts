import { describe, expect, it } from 'vitest';

import { summarizeRelayQueueSloWindow } from './readiness-thresholds';

describe('summarizeRelayQueueSloWindow', () => {
  it('marks window critical when critical occupancy exceeds threshold', () => {
    const summary = summarizeRelayQueueSloWindow({
      now: new Date('2026-03-20T18:30:00.000Z'),
      windowMinutes: 30,
      watchThresholdPercent: 20,
      criticalThresholdPercent: 5,
      samples: [
        { capturedAt: '2026-03-20T18:00:00.000Z', level: 'good' },
        { capturedAt: '2026-03-20T18:10:00.000Z', level: 'critical' },
        { capturedAt: '2026-03-20T18:20:00.000Z', level: 'good' },
        { capturedAt: '2026-03-20T18:30:00.000Z', level: 'good' },
      ],
    });

    expect(summary).toMatchObject({
      status: 'critical',
      observedSeconds: 1800,
      stateSeconds: {
        good: 1200,
        watch: 0,
        critical: 600,
      },
      stateRatios: {
        critical: 33.33,
      },
    });
  });

  it('returns insufficient-data when fewer than 2 samples are available', () => {
    const summary = summarizeRelayQueueSloWindow({
      now: new Date('2026-03-20T18:30:00.000Z'),
      windowMinutes: 30,
      watchThresholdPercent: 20,
      criticalThresholdPercent: 5,
      samples: [{ capturedAt: '2026-03-20T18:30:00.000Z', level: 'good' }],
    });

    expect(summary).toMatchObject({
      status: 'insufficient-data',
      observedSeconds: 0,
      sampleCount: 1,
    });
  });
});
