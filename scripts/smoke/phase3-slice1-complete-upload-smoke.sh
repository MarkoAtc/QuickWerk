#!/usr/bin/env bash
# Phase 3 Slice 1 — Booking Completion + Payment + Upload URL smoke test
# Milestone 3a + 3b
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke/phase3-slice1-complete-upload-smoke.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

# ─── helpers ────────────────────────────────────────────────────────────────

req() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"

  if [[ -n "$token" && -n "$body" ]]; then
    curl --silent --max-time 30 \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL$path"
  elif [[ -n "$token" ]]; then
    curl --silent --max-time 30 \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      "$BASE_URL$path"
  elif [[ -n "$body" ]]; then
    curl --silent --max-time 30 \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL$path"
  else
    curl --silent --max-time 30 \
      -X "$method" \
      "$BASE_URL$path"
  fi
}

req_status() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"

  if [[ -n "$token" && -n "$body" ]]; then
    curl --silent --output /dev/null --write-out '%{http_code}' --max-time 30 \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL$path"
  elif [[ -n "$token" ]]; then
    curl --silent --output /dev/null --write-out '%{http_code}' --max-time 30 \
      -X "$method" \
      -H "Authorization: Bearer $token" \
      "$BASE_URL$path"
  elif [[ -n "$body" ]]; then
    curl --silent --output /dev/null --write-out '%{http_code}' --max-time 30 \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$BASE_URL$path"
  else
    curl --silent --output /dev/null --write-out '%{http_code}' --max-time 30 \
      -X "$method" \
      "$BASE_URL$path"
  fi
}

extract() {
  local json="$1"
  local field="$2"
  echo "$json" | sed -n "s/.*\"${field}\":\"\([^\"]*\)\".*/\1/p" | head -1
}

assert_contains() {
  local label="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected to contain: $needle"
    echo "         Got: $haystack"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local label="$1"
  local haystack="$2"
  local needle="$3"
  if ! echo "$haystack" | grep -q "$needle"; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected NOT to contain: $needle"
    FAIL=$((FAIL + 1))
  fi
}

assert_status() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  [PASS] $label (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected HTTP $expected, got HTTP $actual"
    FAIL=$((FAIL + 1))
  fi
}

# ─── Step 1: health check ────────────────────────────────────────────────────
echo ""
echo "=== Step 1: API health check ==="
health=$(req GET /api/v1/health)
assert_contains "health endpoint responds" "$health" '"status"'

# ─── Step 2: provider setup ──────────────────────────────────────────────────
echo ""
echo "=== Step 2: Provider setup ==="
provider_signup=$(req POST /api/v1/auth/sign-up "" '{"email":"provider-p3s1@quickwerk.local","role":"provider"}')
PROVIDER_TOKEN=$(extract "$provider_signup" "token")
assert_contains "provider sign-up returns token" "$provider_signup" '"token"'

profile_res=$(req PUT /api/v1/providers/me/profile "$PROVIDER_TOKEN" \
  '{"displayName":"Phase3 Provider","tradeCategories":["plumbing"],"isPublic":true}')
assert_contains "provider profile upsert succeeds" "$profile_res" '"displayName"'

# ─── Step 3: customer setup ──────────────────────────────────────────────────
echo ""
echo "=== Step 3: Customer setup ==="
customer_signup=$(req POST /api/v1/auth/sign-up "" '{"email":"customer-p3s1@quickwerk.local","role":"customer"}')
CUSTOMER_TOKEN=$(extract "$customer_signup" "token")
assert_contains "customer sign-up returns token" "$customer_signup" '"token"'

# ─── Step 4: customer creates booking ────────────────────────────────────────
echo ""
echo "=== Step 4: Customer creates booking ==="
booking_res=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" '{"requestedService":"Phase3 plumbing test"}')
BOOKING_ID=$(extract "$booking_res" "bookingId")
assert_contains "booking created with bookingId" "$booking_res" '"bookingId"'
assert_contains "booking status is submitted" "$booking_res" '"submitted"'

# ─── Step 5: provider accepts booking ────────────────────────────────────────
echo ""
echo "=== Step 5: Provider accepts booking ==="
accept_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/accept" "$PROVIDER_TOKEN")
assert_contains "accept returns accepted status" "$accept_res" '"accepted"'

# ─── Step 6: guard — customer cannot complete booking ────────────────────────
echo ""
echo "=== Step 6: Guard — customer cannot complete booking ==="
customer_complete_status=$(req_status POST "/api/v1/bookings/${BOOKING_ID}/complete" "$CUSTOMER_TOKEN")
assert_status "customer complete → 403 role guard" "$customer_complete_status" "403"

# ─── Step 7: provider completes booking ──────────────────────────────────────
echo ""
echo "=== Step 7: Provider completes booking ==="
complete_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/complete" "$PROVIDER_TOKEN")
assert_contains "complete returns booking" "$complete_res" '"booking"'
assert_contains "complete booking status is completed" "$complete_res" '"completed"'
assert_contains "complete returns payment" "$complete_res" '"payment"'
assert_contains "payment status is captured" "$complete_res" '"captured"'
assert_contains "payment has currency EUR" "$complete_res" '"EUR"'

# ─── Step 8: GET booking payment ─────────────────────────────────────────────
echo ""
echo "=== Step 8: Fetch booking payment ==="
payment_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/payment" "$CUSTOMER_TOKEN")
assert_contains "payment has bookingId" "$payment_res" "\"bookingId\""
assert_contains "payment status is captured" "$payment_res" '"captured"'
assert_contains "payment has paymentId" "$payment_res" '"paymentId"'

# ─── Step 9: guard — unauthenticated cannot fetch payment ────────────────────
echo ""
echo "=== Step 9: Guard — unauthenticated cannot fetch payment ==="
unauth_payment_status=$(req_status GET "/api/v1/bookings/${BOOKING_ID}/payment")
assert_status "unauthenticated payment fetch → 401" "$unauth_payment_status" "401"

# ─── Step 10: idempotency — provider completes again ─────────────────────────
echo ""
echo "=== Step 10: Idempotency — provider completes again ==="
complete_again=$(req POST "/api/v1/bookings/${BOOKING_ID}/complete" "$PROVIDER_TOKEN")
assert_contains "idempotent complete still returns booking" "$complete_again" '"booking"'
assert_contains "idempotent complete still returns completed status" "$complete_again" '"completed"'

# ─── Step 11: upload URL — provider requests presigned URL ───────────────────
echo ""
echo "=== Step 11: Provider requests verification upload URL ==="
upload_res=$(req POST /api/v1/providers/me/verification/upload-url "$PROVIDER_TOKEN" \
  '{"filename":"license.pdf","mimeType":"application/pdf"}')
assert_contains "upload URL has uploadId" "$upload_res" '"uploadId"'
assert_contains "upload URL has presignedUrl" "$upload_res" '"presignedUrl"'
assert_contains "upload URL has expiresAt" "$upload_res" '"expiresAt"'
assert_contains "upload URL stub token present" "$upload_res" "stub-presigned-token"
assert_contains "upload URL has correct filename" "$upload_res" '"license.pdf"'
assert_contains "upload URL has correct mimeType" "$upload_res" '"application/pdf"'

# ─── Step 12: guard — customer cannot request upload URL ─────────────────────
echo ""
echo "=== Step 12: Guard — customer cannot request upload URL ==="
customer_upload_status=$(req_status POST /api/v1/providers/me/verification/upload-url \
  "$CUSTOMER_TOKEN" '{"filename":"doc.pdf","mimeType":"application/pdf"}')
assert_status "customer upload URL request → 403" "$customer_upload_status" "403"

# ─── Step 13: guard — unauthenticated cannot request upload URL ──────────────
echo ""
echo "=== Step 13: Guard — unauthenticated cannot request upload URL ==="
unauth_upload_status=$(req_status POST /api/v1/providers/me/verification/upload-url \
  "" '{"filename":"doc.pdf","mimeType":"application/pdf"}')
assert_status "unauthenticated upload URL request → 401" "$unauth_upload_status" "401"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "Phase 3 Slice 1 Smoke Test"
echo "PASSED: $PASS   FAILED: $FAIL"
echo "=========================================="

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
