#!/usr/bin/env bash
# Phase 3 Slice 2 — Payouts + Invoice/Receipt smoke test
# Milestone 3c + 3d
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke/phase3-slice2-payouts-invoices-smoke.sh

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

assert_nonempty() {
  local label="$1"
  local value="$2"
  if [[ -n "$value" ]]; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — value was empty"
    FAIL=$((FAIL + 1))
  fi
}

assert_gt_zero() {
  local label="$1"
  local value="$2"
  if [[ "${value:-0}" -gt 0 ]]; then
    echo "  [PASS] $label ($value)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected > 0, got: ${value:-empty}"
    FAIL=$((FAIL + 1))
  fi
}

assert_eq() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label — expected: $expected, got: $actual"
    FAIL=$((FAIL + 1))
  fi
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

extract() {
  local json="$1"
  local field="$2"
  echo "$json" | sed -n "s/.*\"${field}\":\"\([^\"]*\)\".*/\1/p" | head -1
}

extract_num() {
  local json="$1"
  local field="$2"
  echo "$json" | sed -n "s/.*\"${field}\":\([0-9][0-9]*\).*/\1/p" | head -1
}

summary() {
  echo ""
  echo "=========================================="
  echo "Phase 3 Slice 2 Smoke Test"
  echo "PASSED: $PASS   FAILED: $FAIL"
  echo "=========================================="

  if [[ $FAIL -gt 0 ]]; then
    exit 1
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
provider_signup=$(req POST /api/v1/auth/sign-up "" \
  '{"email":"provider-p3s2@quickwerk.local","password":"password123","role":"provider"}')
PROVIDER_TOKEN=$(extract "$provider_signup" "token")
assert_contains "provider sign-up returns token" "$provider_signup" '"token"'

# ─── Step 3: customer setup ──────────────────────────────────────────────────
echo ""
echo "=== Step 3: Customer setup ==="
customer_signup=$(req POST /api/v1/auth/sign-up "" \
  '{"email":"customer-p3s2@quickwerk.local","password":"password123","role":"customer"}')
CUSTOMER_TOKEN=$(extract "$customer_signup" "token")
assert_contains "customer sign-up returns token" "$customer_signup" '"token"'

# ─── Step 4: customer creates booking ────────────────────────────────────────
echo ""
echo "=== Step 4: Customer creates booking ==="
booking_res=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" \
  '{"requestedService":"Phase3 Slice2 plumbing test"}')
BOOKING_ID=$(extract "$booking_res" "bookingId")
assert_contains "booking created with bookingId" "$booking_res" '"bookingId"'
assert_contains "booking status is submitted" "$booking_res" '"submitted"'

# ─── Step 5: provider accepts booking ────────────────────────────────────────
echo ""
echo "=== Step 5: Provider accepts booking ==="
accept_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/accept" "$PROVIDER_TOKEN")
assert_contains "accept returns accepted status" "$accept_res" '"accepted"'

# ─── Step 6: provider completes booking ──────────────────────────────────────
# triggers: payment capture → payout creation → invoice generation
echo ""
echo "=== Step 6: Provider completes booking ==="
complete_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/complete" "$PROVIDER_TOKEN")
assert_contains "complete returns booking" "$complete_res" '"booking"'
assert_contains "complete booking status is completed" "$complete_res" '"completed"'
assert_contains "complete returns payment" "$complete_res" '"payment"'
assert_contains "payment status is captured" "$complete_res" '"captured"'

# ─── Step 7: Milestone 3c — payout list ──────────────────────────────────────
echo ""
echo "=== Step 7: Payout list (Milestone 3c) ==="
payouts_res=$(req GET /api/v1/providers/me/payouts "$PROVIDER_TOKEN")
assert_contains "payout list has payoutId" "$payouts_res" '"payoutId"'
assert_contains "payout status is pending" "$payouts_res" '"pending"'
assert_contains "payout has currency" "$payouts_res" '"currency"'
assert_contains "payout has amountCents" "$payouts_res" '"amountCents"'

PAYOUT_ID=$(extract "$payouts_res" "payoutId")
assert_nonempty "[payout list] payoutId is non-empty" "$PAYOUT_ID"
PAYOUT_AMOUNT=$(extract_num "$payouts_res" "amountCents")
assert_gt_zero "[payout list] amountCents > 0" "$PAYOUT_AMOUNT"

# ─── Step 8: Milestone 3c — payout detail ────────────────────────────────────
echo ""
echo "=== Step 8: Payout detail (Milestone 3c) ==="
payout_res=$(req GET "/api/v1/providers/me/payouts/${PAYOUT_ID}" "$PROVIDER_TOKEN")
assert_contains "payout detail returns payoutId" "$payout_res" '"payoutId"'
PAYOUT_DETAIL_ID=$(extract "$payout_res" "payoutId")
assert_eq "payout detail payoutId matches" "$PAYOUT_DETAIL_ID" "$PAYOUT_ID"
assert_contains "payout detail settlementRef is null" "$payout_res" '"settlementRef":null'
PAYOUT_DETAIL_AMOUNT=$(extract_num "$payout_res" "amountCents")
assert_gt_zero "[payout detail] amountCents > 0" "$PAYOUT_DETAIL_AMOUNT"

# ─── Step 9: Milestone 3d — invoice via customer token ───────────────────────
echo ""
echo "=== Step 9: Invoice via customer token (Milestone 3d) ==="
invoice_customer_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/invoice" "$CUSTOMER_TOKEN")
assert_contains "invoice has invoiceId" "$invoice_customer_res" '"invoiceId"'
assert_contains "invoice has totalCents" "$invoice_customer_res" '"totalCents"'
assert_contains "invoice pdfUrl is null" "$invoice_customer_res" '"pdfUrl":null'

INVOICE_ID=$(extract "$invoice_customer_res" "invoiceId")
assert_nonempty "[invoice] invoiceId is non-empty" "$INVOICE_ID"
INVOICE_TOTAL=$(extract_num "$invoice_customer_res" "totalCents")
assert_gt_zero "[invoice] totalCents > 0" "$INVOICE_TOTAL"

# ─── Step 10: Milestone 3d — invoice via provider token ──────────────────────
echo ""
echo "=== Step 10: Invoice via provider token (Milestone 3d) ==="
invoice_provider_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/invoice" "$PROVIDER_TOKEN")
assert_contains "provider invoice has invoiceId" "$invoice_provider_res" '"invoiceId"'
INVOICE_ID_PROVIDER=$(extract "$invoice_provider_res" "invoiceId")
assert_eq "provider invoice has same invoiceId" "$INVOICE_ID_PROVIDER" "$INVOICE_ID"

# ─── Step 11: Authorization guard — customer cannot list payouts ──────────────
echo ""
echo "=== Step 11: Authorization guard — customer cannot list payouts ==="
customer_payouts_status=$(req_status GET /api/v1/providers/me/payouts "$CUSTOMER_TOKEN")
assert_status "customer payout list → 403" "$customer_payouts_status" "403"

# ─── Step 12: Authorization guard — unauthenticated cannot list payouts ───────
echo ""
echo "=== Step 12: Authorization guard — unauthenticated cannot list payouts ==="
unauth_payouts_status=$(req_status GET /api/v1/providers/me/payouts)
assert_status "unauthenticated payout list → 401" "$unauth_payouts_status" "401"

# ─── Step 13: Authorization guard — customer cannot fetch payout detail ───────
echo ""
echo "=== Step 13: Authorization guard — customer cannot fetch payout detail ==="
customer_payout_detail_status=$(req_status GET "/api/v1/providers/me/payouts/${PAYOUT_ID}" "$CUSTOMER_TOKEN")
assert_status "customer payout detail → 403" "$customer_payout_detail_status" "403"

# ─── Step 14: Authorization guard — unauthenticated cannot fetch invoice ──────
echo ""
echo "=== Step 14: Authorization guard — unauthenticated cannot fetch invoice ==="
unauth_invoice_status=$(req_status GET "/api/v1/bookings/${BOOKING_ID}/invoice")
assert_status "unauthenticated invoice fetch → 401" "$unauth_invoice_status" "401"

# ─── Summary ─────────────────────────────────────────────────────────────────
summary
