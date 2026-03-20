# Relay Queue Degradation Runbook (Phase-2)

This runbook covers queue pressure/degradation handling for the Postgres-persistent booking relay path.

## Scope

- service: `@quickwerk/platform-api`
- transport table: `booking_accepted_relay_attempts`
- worker tick: `RelayQueueWorkerService`
- readiness endpoint: `GET /health/readiness`
- operator inspection endpoints:
  - `GET /operators/relay-queue/attempts`
  - `GET /operators/relay-queue/snapshots`

## Signals to watch

From `GET /health/readiness` (`relayQueue` payload):

- `level`: `good | watch | critical`
- `counters.depth`
- `counters.dueCount`
- `counters.deadLetterCount`
- `lagMs`
- `thresholds.*`

### Threshold env knobs

```bash
BOOKING_ACCEPTED_RELAY_READINESS_LAG_WATCH_MS=15000
BOOKING_ACCEPTED_RELAY_READINESS_LAG_CRITICAL_MS=60000
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_WATCH_COUNT=10
BOOKING_ACCEPTED_RELAY_READINESS_DEPTH_CRITICAL_COUNT=50
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_WATCH_COUNT=1
BOOKING_ACCEPTED_RELAY_READINESS_DEAD_LETTER_CRITICAL_COUNT=5
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
3. **Inspect recent attempts**
   - call `GET /operators/relay-queue/attempts?status=dead-letter&limit=20`
   - sample a recent failure window with `eventId` / `correlationId` filters
4. **Inspect queue snapshot trend**
   - call `GET /operators/relay-queue/snapshots?limit=50`
   - verify whether pressure is transient or sustained
5. **Take corrective action**
   - validate worker tick process health
   - reduce downstream failure causes (provider/API outage, schema mismatch, etc.)
   - tune thresholds only after confirming expected traffic profile changed

## Alert examples

> Pseudocode-style examples; map to your monitoring stack (Prometheus/Grafana/Datadog).

### Watch-level lag alert

```yaml
alert: QwRelayQueueLagWatch
expr: relay_queue_lag_ms >= relay_queue_lag_watch_ms
for: 10m
labels:
  severity: warning
annotations:
  summary: "QuickWerk relay queue lag is in watch zone"
  description: "lagMs has exceeded watch threshold for 10m. Check /operators/relay-queue/snapshots."
```

### Critical backlog/dead-letter alert

```yaml
alert: QwRelayQueueCritical
expr: |
  relay_queue_lag_ms >= relay_queue_lag_critical_ms
  OR relay_queue_depth >= relay_queue_depth_critical_count
  OR relay_queue_dead_letter_count >= relay_queue_dead_letter_critical_count
for: 5m
labels:
  severity: critical
annotations:
  summary: "QuickWerk relay queue is degraded"
  description: "Critical queue pressure detected. Start runbook triage and inspect dead-letter attempts immediately."
```

### Dead-letter rate spike alert (optional)

```yaml
alert: QwRelayDeadLetterSpike
expr: increase(relay_queue_dead_letter_count[15m]) >= 3
for: 0m
labels:
  severity: warning
annotations:
  summary: "QuickWerk dead-letter count spiking"
  description: "Dead-letter attempts increased sharply in the last 15m. Investigate downstream reliability."
```

## Notes

- snapshot history in `/operators/relay-queue/snapshots` is **process-memory retained**, not durable across restarts.
- `/health` legacy payload remains unchanged; queue pressure is surfaced via `/health/readiness`.
