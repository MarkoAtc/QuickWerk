# Relay Queue Degradation Runbook (Phase-4)

This runbook covers queue pressure/degradation handling for the Postgres-persistent booking relay path.

## Scope

- service: `@quickwerk/platform-api`
- transport table: `booking_accepted_relay_attempts`
- snapshot table: `booking_accepted_relay_queue_snapshots`
- worker tick: `RelayQueueWorkerService`
- readiness endpoint: `GET /health/readiness`
- operator inspection endpoints:
  - `GET /operators/relay-queue/attempts`
  - `GET /operators/relay-queue/snapshots`
  - `GET /operators/relay-queue/attempts.csv`

## Operator access policy (authN/authZ)

By default, `/operators/relay-queue/*` is authenticated and role-gated.

- requires `Authorization: Bearer <token>`
- migration default (`operator-provider-transition`) allows both operator and legacy provider sessions
- optional strict mode (`operator-strict`) allows only dedicated operator sessions
- optional backward-compatible bypass: `BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE=legacy-open`

Env knobs:

```bash
BOOKING_ACCEPTED_RELAY_OPERATOR_AUTH_MODE=required
BOOKING_ACCEPTED_RELAY_OPERATOR_ROLE_MODE=operator-provider-transition
# optional explicit override (comma-separated)
BOOKING_ACCEPTED_RELAY_OPERATOR_ALLOWED_ROLES=operator,provider
```

## Signals to watch

From `GET /health/readiness` (`relayQueue` payload):

- `level`: `good | watch | critical`
- `counters.depth`
- `counters.dueCount`
- `counters.deadLetterCount`
- `lagMs`
- `thresholds.*`
- `sloWindow.*` (rolling occupancy summary)

### Threshold env knobs

```bash
BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS=15000
BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS=60000
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT=10
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT=50
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT=1
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT=5
BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION=200
```

### SLO window env knobs

```bash
BOOKING_ACCEPTED_RELAY_SLO_WINDOW_MINUTES=30
BOOKING_ACCEPTED_RELAY_SLO_SAMPLE_LIMIT=240
BOOKING_ACCEPTED_RELAY_SLO_WATCH_THRESHOLD_PERCENT=20
BOOKING_ACCEPTED_RELAY_SLO_CRITICAL_THRESHOLD_PERCENT=5
```

## Triage flow

1. **Confirm mode/config health**
   - `BOOKING_ACCEPTED_RELAY_ATTEMPT_EXECUTOR_MODE=postgres-persistent`
   - `PERSISTENCE_MODE=postgres`
   - DB connectivity healthy
2. **Check readiness pressure shape**
   - high `lagMs` with low `deadLetterCount` => worker drain lag/backlog growth
   - rising `deadLetterCount` => downstream processing failures near/at max attempts
   - high `depth` + high `dueCount` => queue is not draining fast enough
   - `sloWindow.status=watch|critical` => sustained pressure across the configured rolling window (not only point-in-time spikes)
3. **Inspect recent attempts**
   - call `GET /operators/relay-queue/attempts?status=dead-letter&limit=20`
   - for handoff, export bounded CSV: `GET /operators/relay-queue/attempts.csv?limit=50`
   - sample a recent failure window with `eventId` / `correlationId` filters
4. **Inspect queue snapshot trend**
   - call `GET /operators/relay-queue/snapshots?limit=50`
   - verify whether pressure is transient or sustained
5. **Take corrective action**
   - validate worker tick process health
   - reduce downstream failure causes (provider/API outage, schema mismatch, etc.)
   - tune thresholds only after confirming expected traffic profile changed

## Dashboard mapping examples

### Grafana panel mapping (JSON API / Infinity style)

Use `/operators/relay-queue/snapshots?limit=100` and map:

- time axis: `relayQueue.snapshots[].capturedAt`
- queue depth: `relayQueue.snapshots[].metrics.depth`
- due count: `relayQueue.snapshots[].metrics.dueCount`
- dead-letter count: `relayQueue.snapshots[].metrics.deadLetterCount`
- lag: `relayQueue.snapshots[].metrics.processingLagMs`
- state panel: `relayQueue.current.level`
- sustained pressure panel: `relayQueue.current.sloWindow.status`

### Alertmanager rule mapping (from readiness)

Use `/health/readiness` fields:

- `relayQueue.level`
- `relayQueue.counters.depth`
- `relayQueue.counters.dueCount`
- `relayQueue.counters.deadLetterCount`
- `relayQueue.lagMs`
- `relayQueue.sloWindow.status`
- `relayQueue.sloWindow.stateRatios.critical`

Example pseudo-rules:

```yaml
- alert: QwRelayQueueLagWatch
  expr: relay_queue_lag_ms >= relay_queue_lag_watch_ms
  for: 10m
  labels:
    severity: warning

- alert: QwRelayQueueCritical
  expr: |
    relay_queue_lag_ms >= relay_queue_lag_critical_ms
    OR relay_queue_depth >= relay_queue_depth_critical_count
    OR relay_queue_dead_letter_count >= relay_queue_dead_letter_critical_count
    OR relay_queue_slo_critical_ratio_percent >= relay_queue_slo_critical_threshold_percent
  for: 5m
  labels:
    severity: critical
```

## Endpoint smoke checks

Use `scripts/smoke/operator-relay-queue-smoke.sh`:

```bash
QW_PLATFORM_API_BASE_URL=http://localhost:3000 \
QW_OPERATOR_BEARER_TOKEN=<operator-or-provider-session-token> \
./scripts/smoke/operator-relay-queue-smoke.sh
```

## Notes

- snapshot history in `/operators/relay-queue/snapshots` is persisted in Postgres table `booking_accepted_relay_queue_snapshots`.
- retention is bounded by `BOOKING_ACCEPTED_RELAY_QUEUE_SNAPSHOT_RETENTION` cleanup on insert.
- `/operators/relay-queue/attempts.csv` is bounded and restricted to allow-listed columns for dead-letter inspection handoff.
- `/health` legacy payload remains unchanged; queue pressure is surfaced via `/health/readiness`.
