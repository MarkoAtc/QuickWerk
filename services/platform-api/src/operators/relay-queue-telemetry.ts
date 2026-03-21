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

let state = initialState();

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

export function resetRelayQueueOperatorTelemetryForTests() {
  state = initialState();
}
