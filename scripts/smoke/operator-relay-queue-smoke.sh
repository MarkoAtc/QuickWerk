#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${QW_PLATFORM_API_BASE_URL:-http://localhost:3000}"
TOKEN="${QW_OPERATOR_BEARER_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "QW_OPERATOR_BEARER_TOKEN is required (provider-role bearer token)." >&2
  exit 1
fi

echo "[smoke] GET $BASE_URL/operators/relay-queue/attempts"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/operators/relay-queue/attempts?limit=5" \
  | tee /tmp/qw-relay-attempts-smoke.json >/dev/null

echo "[smoke] GET $BASE_URL/operators/relay-queue/snapshots"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/operators/relay-queue/snapshots?limit=5" \
  | tee /tmp/qw-relay-snapshots-smoke.json >/dev/null

echo "[smoke] Operator relay queue endpoints responded successfully."
