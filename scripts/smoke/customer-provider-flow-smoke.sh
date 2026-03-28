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

echo "[smoke] Sign in as customer"
CUSTOMER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"customer.smoke@quickwerk.local","role":"customer"}')
CUSTOMER_TOKEN=$(echo "$CUSTOMER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$CUSTOMER_TOKEN" ]]; then
  echo "[smoke] ERROR: customer token missing" >&2
  exit 1
fi

echo "[smoke] Create booking as customer"
BOOKING_RESPONSE=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" '{"requestedService":"Smoke test booking"}')
BOOKING_ID=$(echo "$BOOKING_RESPONSE" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')

if [[ -z "$BOOKING_ID" ]]; then
  echo "[smoke] ERROR: booking id missing" >&2
  exit 1
fi

echo "[smoke] Customer fetches booking by id"
req GET "/api/v1/bookings/$BOOKING_ID" "$CUSTOMER_TOKEN" >/dev/null

echo "[smoke] Sign in as provider"
PROVIDER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"provider.smoke@quickwerk.local","role":"provider"}')
PROVIDER_TOKEN=$(echo "$PROVIDER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$PROVIDER_TOKEN" ]]; then
  echo "[smoke] ERROR: provider token missing" >&2
  exit 1
fi

echo "[smoke] Provider lists open bookings"
LIST_RESPONSE=$(req GET /api/v1/bookings "$PROVIDER_TOKEN")
echo "$LIST_RESPONSE" | grep -q "$BOOKING_ID"

echo "[smoke] Provider accepts booking"
ACCEPT_RESPONSE=$(req POST "/api/v1/bookings/$BOOKING_ID/accept" "$PROVIDER_TOKEN")
echo "$ACCEPT_RESPONSE" | grep -q '"status":"accepted"'

echo "[smoke] Flow passed: sign-in -> create booking -> get booking -> provider list -> accept"
