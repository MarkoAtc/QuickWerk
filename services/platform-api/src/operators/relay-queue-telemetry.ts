import type { SessionRole } from '../auth/domain/auth-session.repository';
import { logStructuredBreadcrumb } from '../observability/structured-log';

export type OperatorRoleMode = 'operator-strict' | 'operator-provider-transition';

type OperatorAccessPolicyLike = {
  authMode: 'required' | 'legacy-open';
  roleMode: OperatorRoleMode;
  allowedRoles: SessionRole[];
};

type OperatorAccessDecision = 'allowed' | 'denied-auth' | 'denied-role' | 'legacy-open';

type RelayQueueOperatorTelemetryState = {
  roleModeUsage: Record<OperatorRoleMode, number>;
  deniedRoleCount: Record<SessionRole, number>;
  deniedAuthCount: number;
  totalAccessChecks: number;
  lastEventAt: string | null;
};

type RelayQueueEndpointLatencyTelemetryState = {
  endpointWindows: Record<string, number[]>;
  sampleCap: number;
  totalObservedRequests: number;
  lastEventAt: string | null;
};

type RelayQueueEndpointLatencySummary = {
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
};

const initialState = (): RelayQueueOperatorTelemetryState => ({
  roleModeUsage: {
    'operator-provider-transition': 0,
    'operator-strict': 0,
  },
  deniedRoleCount: {
    customer: 0,
    provider: 0,
    operator: 0,
  },
  deniedAuthCount: 0,
  totalAccessChecks: 0,
  lastEventAt: null,
});

const initialLatencyState = (): RelayQueueEndpointLatencyTelemetryState => ({
  endpointWindows: {},
  sampleCap: 200,
  totalObservedRequests: 0,
  lastEventAt: null,
});

let state = initialState();
let latencyState = initialLatencyState();

export function recordRelayQueueOperatorAccess(input: {
  endpoint: string;
  policy: OperatorAccessPolicyLike;
  decision: OperatorAccessDecision;
  sessionRole?: SessionRole;
}) {
  state.totalAccessChecks += 1;
  state.roleModeUsage[input.policy.roleMode] += 1;

  if (input.decision === 'denied-role' && input.sessionRole) {
    state.deniedRoleCount[input.sessionRole] += 1;
  }

  if (input.decision === 'denied-auth') {
    state.deniedAuthCount += 1;
  }

  state.lastEventAt = new Date().toISOString();

  logStructuredBreadcrumb({
    event: 'booking.accepted.relay.operator.access.telemetry',
    correlationId: `operator-relay-${input.endpoint}`,
    status: input.decision === 'allowed' || input.decision === 'legacy-open' ? 'succeeded' : 'failed',
    details: {
      endpoint: input.endpoint,
      authMode: input.policy.authMode,
      roleMode: input.policy.roleMode,
      allowedRoles: input.policy.allowedRoles,
      decision: input.decision,
      sessionRole: input.sessionRole ?? null,
      counters: getRelayQueueOperatorTelemetrySnapshot(),
    },
  });
}

export function getRelayQueueOperatorTelemetrySnapshot(): RelayQueueOperatorTelemetryState {
  return {
    roleModeUsage: {
      'operator-provider-transition': state.roleModeUsage['operator-provider-transition'],
      'operator-strict': state.roleModeUsage['operator-strict'],
    },
    deniedRoleCount: {
      customer: state.deniedRoleCount.customer,
      provider: state.deniedRoleCount.provider,
      operator: state.deniedRoleCount.operator,
    },
    deniedAuthCount: state.deniedAuthCount,
    totalAccessChecks: state.totalAccessChecks,
    lastEventAt: state.lastEventAt,
  };
}

export function recordRelayQueueEndpointLatency(input: { endpoint: string; durationMs: number }) {
  const durationMs = Math.max(0, Math.round(input.durationMs));
  const existingWindow = latencyState.endpointWindows[input.endpoint] ?? [];
  const nextWindow = [...existingWindow, durationMs];
  const overflow = Math.max(0, nextWindow.length - latencyState.sampleCap);

  latencyState.endpointWindows[input.endpoint] = overflow > 0 ? nextWindow.slice(overflow) : nextWindow;
  latencyState.totalObservedRequests += 1;
  latencyState.lastEventAt = new Date().toISOString();
}

export function getRelayQueueEndpointLatencyTelemetrySnapshot(): {
  sampleCap: number;
  totalObservedRequests: number;
  lastEventAt: string | null;
  byEndpoint: Record<string, RelayQueueEndpointLatencySummary>;
} {
  const byEndpoint: Record<string, RelayQueueEndpointLatencySummary> = {};

  for (const [endpoint, samples] of Object.entries(latencyState.endpointWindows)) {
    byEndpoint[endpoint] = summarizeLatency(samples);
  }

  return {
    sampleCap: latencyState.sampleCap,
    totalObservedRequests: latencyState.totalObservedRequests,
    lastEventAt: latencyState.lastEventAt,
    byEndpoint,
  };
}

export function resetRelayQueueOperatorTelemetryForTests() {
  state = initialState();
  latencyState = initialLatencyState();
}

function summarizeLatency(samples: number[]): RelayQueueEndpointLatencySummary {
  if (samples.length === 0) {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      sampleCount: 0,
    };
  }

  const sorted = [...samples].sort((left, right) => left - right);

  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    sampleCount: sorted.length,
  };
}

function percentile(sortedSamples: number[], percentileValue: number): number {
  if (sortedSamples.length === 0) {
    return 0;
  }

  const index = Math.min(sortedSamples.length - 1, Math.ceil(percentileValue * sortedSamples.length) - 1);
  return sortedSamples[index];
}
