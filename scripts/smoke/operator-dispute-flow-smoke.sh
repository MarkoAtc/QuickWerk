#!/usr/bin/env bash
# Smoke test: dispute submit -> operator start-review -> resolve -> pending list terminal check
set -euo pipefail

BASE_URL="${QW_PLATFORM_API_BASE_URL:-http://127.0.0.1:3101}"

req() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"

  if [[ -n "$token" ]]; then
    if [[ -n "$body" ]]; then
      curl --fail --silent --show-error \
        -X "$method" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$body" \
        "$BASE_URL$path"
    else
      curl --fail --silent --show-error \
        -X "$method" \
        -H "Authorization: Bearer $token" \
        "$BASE_URL$path"
    fi
  else
    if [[ -n "$body" ]]; then
      curl --fail --silent --show-error \
        -X "$method" \
        -H "Content-Type: application/json" \
        -d "$body" \
        "$BASE_URL$path"
    else
      curl --fail --silent --show-error -X "$method" "$BASE_URL$path"
    fi
  fi
}

echo "[smoke] === Operator Dispute Flow ==="

echo "[smoke] Sign in as customer"
CUSTOMER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"customer.dispute.smoke@quickwerk.local","role":"customer"}')
CUSTOMER_TOKEN=$(echo "$CUSTOMER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$CUSTOMER_TOKEN" ]]; then
  echo "[smoke] ERROR: customer token missing" >&2
  exit 1
fi

echo "[smoke] Sign in as provider"
PROVIDER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"provider.dispute.smoke@quickwerk.local","role":"provider"}')
PROVIDER_TOKEN=$(echo "$PROVIDER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
PROVIDER_USER_ID=$(echo "$PROVIDER_SIGNIN" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')

if [[ -z "$PROVIDER_TOKEN" || -z "$PROVIDER_USER_ID" ]]; then
  echo "[smoke] ERROR: provider auth/session data missing" >&2
  exit 1
fi

echo "[smoke] Create booking as customer"
BOOKING_RESPONSE=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" '{"requestedService":"Dispute smoke booking"}')
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')

if [[ -z "$BOOKING_ID" ]]; then
  echo "[smoke] ERROR: booking id missing" >&2
  exit 1
fi

echo "[smoke] Provider accepts booking"
ACCEPT_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING_ID/accept" "$PROVIDER_TOKEN")
echo "$ACCEPT_RESPONSE" | grep -q '"status":"accepted"' || {
  echo "[smoke] ERROR: booking should be accepted" >&2
  exit 1
}

echo "[smoke] Provider completes booking"
COMPLETE_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING_ID/complete" "$PROVIDER_TOKEN" "{\"providerUserId\":\"$PROVIDER_USER_ID\"}")
echo "$COMPLETE_RESPONSE" | grep -q '"status":"completed"' || {
  echo "[smoke] ERROR: booking should be completed" >&2
  exit 1
}

echo "[smoke] Customer submits dispute"
SUBMIT_DISPUTE_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING_ID/dispute" "$CUSTOMER_TOKEN" '{"category":"quality","description":"Work quality was unacceptable"}')
DISPUTE_ID=$(echo "$SUBMIT_DISPUTE_RESPONSE" | sed -n 's/.*"disputeId":"\([^"]*\)".*/\1/p')

if [[ -z "$DISPUTE_ID" ]]; then
  echo "[smoke] ERROR: dispute id missing" >&2
  exit 1
fi

echo "$SUBMIT_DISPUTE_RESPONSE" | grep -q '"status":"open"' || {
  echo "[smoke] ERROR: dispute should start open" >&2
  exit 1
}

echo "[smoke] Sign in as operator"
OPERATOR_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"operator.dispute.smoke@quickwerk.local","role":"operator"}')
OPERATOR_TOKEN=$(echo "$OPERATOR_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$OPERATOR_TOKEN" ]]; then
  echo "[smoke] ERROR: operator token missing" >&2
  exit 1
fi

echo "[smoke] Operator starts dispute review"
START_REVIEW_RESPONSE=$(req PATCH "/api/v1/disputes/$DISPUTE_ID/start-review" "$OPERATOR_TOKEN")
echo "$START_REVIEW_RESPONSE" | grep -q '"status":"under-review"' || {
  echo "[smoke] ERROR: dispute should be under-review" >&2
  exit 1
}

echo "[smoke] Operator resolves dispute"
RESOLVE_RESPONSE=$(req PATCH "/api/v1/disputes/$DISPUTE_ID/resolve" "$OPERATOR_TOKEN" '{"resolutionNote":"Refund issued to customer"}')
echo "$RESOLVE_RESPONSE" | grep -q '"status":"resolved"' || {
  echo "[smoke] ERROR: dispute should be resolved" >&2
  exit 1
}

echo "[smoke] Pending queue should no longer include resolved dispute"
PENDING_AFTER=$(req GET /api/v1/disputes/pending "$OPERATOR_TOKEN")
echo "$PENDING_AFTER" | grep -q "$DISPUTE_ID" && {
  echo "[smoke] ERROR: resolved dispute should not remain in pending queue" >&2
  exit 1
} || true

echo "[smoke] === Flow passed: submit -> start-review -> resolve -> terminal queue removal ==="
