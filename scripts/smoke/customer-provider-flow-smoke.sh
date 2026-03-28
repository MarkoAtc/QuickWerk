#!/usr/bin/env bash
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

# ─── Provider Setup ──────────────────────────────────────────────────────────
echo "[smoke] Sign in as provider"
PROVIDER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"provider.smoke@quickwerk.local","role":"provider"}')
PROVIDER_TOKEN=$(echo "$PROVIDER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$PROVIDER_TOKEN" ]]; then
  echo "[smoke] ERROR: provider token missing" >&2
  exit 1
fi

echo "[smoke] Provider session — extract provider userId"
PROVIDER_SESSION=$(req GET /api/v1/auth/session "$PROVIDER_TOKEN")
PROVIDER_USER_ID=$(echo "$PROVIDER_SESSION" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')

if [[ -z "$PROVIDER_USER_ID" ]]; then
  echo "[smoke] ERROR: provider userId missing from session" >&2
  exit 1
fi

echo "[smoke] Provider creates/updates a public profile"
req PUT /api/v1/providers/me/profile "$PROVIDER_TOKEN" \
  '{"displayName":"Smoke Plumber","tradeCategories":["plumbing"],"serviceArea":"Vienna","isPublic":true}' \
  >/dev/null

# ─── Discovery Flow ───────────────────────────────────────────────────────────
echo "[smoke] Customer (unauthenticated) lists public providers"
LIST_RESPONSE=$(req GET /api/v1/providers "")
echo "$LIST_RESPONSE" | grep -q "Smoke Plumber"

echo "[smoke] Customer fetches single provider by ID (Slice 4 endpoint)"
DETAIL_RESPONSE=$(req GET "/api/v1/providers/$PROVIDER_USER_ID" "")
echo "$DETAIL_RESPONSE" | grep -q '"providerUserId"'
echo "$DETAIL_RESPONSE" | grep -q "Smoke Plumber"

echo "[smoke] Provider detail 404 for unknown id"
HTTP_STATUS=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  "$BASE_URL/api/v1/providers/nonexistent-provider-id-smoke-$(date +%s)")
if [[ "$HTTP_STATUS" != "404" ]]; then
  echo "[smoke] ERROR: expected 404 for unknown provider, got $HTTP_STATUS" >&2
  exit 1
fi

# ─── Customer Booking Flow ────────────────────────────────────────────────────
echo "[smoke] Sign in as customer"
CUSTOMER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"customer.smoke@quickwerk.local","role":"customer"}')
CUSTOMER_TOKEN=$(echo "$CUSTOMER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$CUSTOMER_TOKEN" ]]; then
  echo "[smoke] ERROR: customer token missing" >&2
  exit 1
fi

echo "[smoke] Customer creates booking (entry from provider detail CTA)"
BOOKING_RESPONSE=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" \
  "{\"requestedService\":\"plumbing / [provider:$PROVIDER_USER_ID]\"}")
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')

if [[ -z "$BOOKING_ID" ]]; then
  echo "[smoke] ERROR: booking id missing" >&2
  exit 1
fi

echo "[smoke] Customer fetches booking by id"
req GET "/api/v1/bookings/$BOOKING_ID" "$CUSTOMER_TOKEN" >/dev/null

# ─── Accept Path ─────────────────────────────────────────────────────────────
echo "[smoke] Provider lists open bookings"
LIST_RESPONSE=$(req GET /api/v1/bookings "$PROVIDER_TOKEN")
echo "$LIST_RESPONSE" | grep -q "$BOOKING_ID"

echo "[smoke] Provider accepts booking"
ACCEPT_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING_ID/accept" "$PROVIDER_TOKEN")
echo "$ACCEPT_RESPONSE" | grep -q '"status":"accepted"'

# ─── Declined Flow ────────────────────────────────────────────────────────────
echo "[smoke] Customer creates a second booking for declined-flow check"
BOOKING2_RESPONSE=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" \
  '{"requestedService":"electrical / smoke decline test"}')
BOOKING2_ID=$(echo "$BOOKING2_RESPONSE" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')

if [[ -z "$BOOKING2_ID" ]]; then
  echo "[smoke] ERROR: second booking id missing" >&2
  exit 1
fi

echo "[smoke] Provider declines booking with reason"
DECLINE_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING2_ID/decline" "$PROVIDER_TOKEN" \
  '{"declineReason":"Outside service area"}')
echo "$DECLINE_RESPONSE" | grep -q '"status":"declined"'
echo "$DECLINE_RESPONSE" | grep -q '"declineReason"'

echo "[smoke] Customer can still fetch declined booking"
CUSTOMER_DECLINED=$(req GET "/api/v1/bookings/$BOOKING2_ID" "$CUSTOMER_TOKEN")
echo "$CUSTOMER_DECLINED" | grep -q '"status":"declined"'

echo ""
echo "[smoke] ALL PASSED: discovery -> provider detail (Slice 4 endpoint) -> booking entry -> accept + declined-flow"
