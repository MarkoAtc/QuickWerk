#!/usr/bin/env bash
# Phase 3 End-to-End Smoke Test
# Milestones 3a-3g: Payments, Payouts, Invoices, Reviews, Disputes
# Usage: BASE_URL=http://localhost:3000 bash scripts/smoke/phase3-e2e-smoke.sh

# NOTE: Full pass requires Reviews API (Milestone 3e) and Disputes API (Milestone 3f) to be merged.

set -uo pipefail

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

assert() {
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
  echo "Phase 3 E2E Smoke Test"
  echo "PASSED: $PASS   FAILED: $FAIL"
  echo "=========================================="

  if [[ $FAIL -gt 0 ]]; then
    exit 1
  fi
}

# ─── Section 1: Health ───────────────────────────────────────────────────────
echo ""
echo "=== Section 1: Health ==="
health=$(req GET /health) || true
assert "health endpoint responds" "$health" '"status"'

# ─── Section 2: Setup ────────────────────────────────────────────────────────
echo ""
echo "=== Section 2: Setup ==="
provider_signup=$(req POST /api/v1/auth/sign-in "" \
  '{"email":"provider-p3e2e@quickwerk.local","role":"provider"}') || true
PROVIDER_TOKEN=$(extract "$provider_signup" "token")
assert "provider sign-in returns token" "$provider_signup" '"token"'
assert_nonempty "provider token non-empty" "$PROVIDER_TOKEN"

customer_signup=$(req POST /api/v1/auth/sign-in "" \
  '{"email":"customer-p3e2e@quickwerk.local","role":"customer"}') || true
CUSTOMER_TOKEN=$(extract "$customer_signup" "token")
assert "customer sign-in returns token" "$customer_signup" '"token"'
assert_nonempty "customer token non-empty" "$CUSTOMER_TOKEN"

# ─── Section 3: Booking flow ─────────────────────────────────────────────────
# customer creates → provider accepts → provider completes
# triggers: payment capture → payout creation → invoice generation
echo ""
echo "=== Section 3: Booking flow ==="
booking_res=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" \
  '{"requestedService":"Phase3 E2E plumbing test"}') || true
BOOKING_ID=$(extract "$booking_res" "bookingId")
assert "booking created with bookingId" "$booking_res" '"bookingId"'
assert "booking status is submitted" "$booking_res" '"submitted"'
assert_nonempty "bookingId non-empty" "$BOOKING_ID"

accept_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/accept" "$PROVIDER_TOKEN") || true
assert "provider accept returns accepted status" "$accept_res" '"accepted"'

complete_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/complete" "$PROVIDER_TOKEN") || true
assert "complete returns booking" "$complete_res" '"booking"'
assert "complete booking status is completed" "$complete_res" '"completed"'
assert "complete returns payment" "$complete_res" '"payment"'
assert "payment status is captured" "$complete_res" '"captured"'

# ─── Section 4: Milestone 3c — Payouts ───────────────────────────────────────
echo ""
echo "=== Section 4: Milestone 3c — Payouts ==="
payouts_res=$(req GET /api/v1/providers/me/payouts "$PROVIDER_TOKEN") || true
assert "payout list returns 200 body" "$payouts_res" '"payoutId"'
assert "payout list response includes payouts array" "$payouts_res" '"payouts"'
assert "payout list response includes nextCursor field" "$payouts_res" '"nextCursor"'
assert "payout list response includes default limit=20" "$payouts_res" '"limit":20'
assert "payout status is pending" "$payouts_res" '"pending"'
assert "payout has amountCents" "$payouts_res" '"amountCents"'

PAYOUT_ID=$(extract "$payouts_res" "payoutId")
assert_nonempty "payoutId non-empty" "$PAYOUT_ID"
PAYOUT_AMOUNT=$(extract_num "$payouts_res" "amountCents")
if [[ "${PAYOUT_AMOUNT:-0}" -gt 0 ]]; then
  echo "  [PASS] payout list amountCents > 0 ($PAYOUT_AMOUNT)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] payout list amountCents expected > 0, got: ${PAYOUT_AMOUNT:-empty}"
  FAIL=$((FAIL + 1))
fi

payouts_limit_1_res=$(req GET "/api/v1/providers/me/payouts?limit=1" "$PROVIDER_TOKEN") || true
assert "payout list with limit=1 includes bounded limit field" "$payouts_limit_1_res" '"limit":1'
assert "payout list with limit=1 includes payouts array" "$payouts_limit_1_res" '"payouts"'
assert "payout list with limit=1 includes nextCursor field" "$payouts_limit_1_res" '"nextCursor"'

payout_res=$(req GET "/api/v1/providers/me/payouts/${PAYOUT_ID}" "$PROVIDER_TOKEN") || true
assert "payout detail returns payoutId" "$payout_res" '"payoutId"'
PAYOUT_DETAIL_AMOUNT=$(extract_num "$payout_res" "amountCents")
if [[ "${PAYOUT_DETAIL_AMOUNT:-0}" -gt 0 ]]; then
  echo "  [PASS] payout detail amountCents > 0 ($PAYOUT_DETAIL_AMOUNT)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] payout detail amountCents expected > 0, got: ${PAYOUT_DETAIL_AMOUNT:-empty}"
  FAIL=$((FAIL + 1))
fi

# ─── Section 5: Milestone 3d — Invoice ───────────────────────────────────────
echo ""
echo "=== Section 5: Milestone 3d — Invoice ==="
invoice_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/invoice" "$CUSTOMER_TOKEN") || true
assert "customer invoice returns invoiceId" "$invoice_res" '"invoiceId"'
assert "invoice pdfUrl is null" "$invoice_res" '"pdfUrl":null'

INVOICE_ID=$(extract "$invoice_res" "invoiceId")
assert_nonempty "invoiceId non-empty" "$INVOICE_ID"
INVOICE_TOTAL=$(extract_num "$invoice_res" "totalCents")
if [[ "${INVOICE_TOTAL:-0}" -gt 0 ]]; then
  echo "  [PASS] invoice totalCents > 0 ($INVOICE_TOTAL)"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] invoice totalCents expected > 0, got: ${INVOICE_TOTAL:-empty}"
  FAIL=$((FAIL + 1))
fi

provider_invoice_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/invoice" "$PROVIDER_TOKEN") || true
assert "provider invoice returns 200 body" "$provider_invoice_res" '"invoiceId"'

# ─── Section 6: Guard checks (3c/3d) ─────────────────────────────────────────
echo ""
echo "=== Section 6: Guard checks (3c/3d) ==="
customer_payouts_status=$(req_status GET /api/v1/providers/me/payouts "$CUSTOMER_TOKEN") || true
assert_status "customer GET /providers/me/payouts → 403" "$customer_payouts_status" "403"

unauth_payouts_status=$(req_status GET /api/v1/providers/me/payouts) || true
assert_status "no-auth GET /providers/me/payouts → 401" "$unauth_payouts_status" "401"

unauth_invoice_status=$(req_status GET "/api/v1/bookings/${BOOKING_ID}/invoice") || true
assert_status "no-auth GET /bookings/:id/invoice → 401" "$unauth_invoice_status" "401"

# ─── Section 7: Milestone 3e — Reviews ───────────────────────────────────────
# NOTE: requires Reviews API merged (Milestone 3e)
echo ""
echo "=== Section 7: Milestone 3e — Reviews (requires Reviews API merged) ==="

customer_review_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/reviews" "$CUSTOMER_TOKEN" \
  '{"rating":5,"comment":"Great work"}') || true
REVIEW_ID_CUSTOMER=$(extract "$customer_review_res" "reviewId")
assert "customer review returns reviewId" "$customer_review_res" '"reviewId"'
assert_nonempty "customer reviewId non-empty" "$REVIEW_ID_CUSTOMER"

provider_review_res=$(req POST "/api/v1/bookings/${BOOKING_ID}/reviews" "$PROVIDER_TOKEN" \
  '{"rating":4}') || true
REVIEW_ID_PROVIDER=$(extract "$provider_review_res" "reviewId")
assert "provider review returns reviewId" "$provider_review_res" '"reviewId"'
assert_nonempty "provider reviewId non-empty" "$REVIEW_ID_PROVIDER"

# Verify both reviewIds are different (customer vs provider)
if [[ -n "$REVIEW_ID_CUSTOMER" && -n "$REVIEW_ID_PROVIDER" && "$REVIEW_ID_CUSTOMER" != "$REVIEW_ID_PROVIDER" ]]; then
  echo "  [PASS] customer and provider have distinct reviewIds"
  PASS=$((PASS + 1))
elif [[ -z "$REVIEW_ID_CUSTOMER" || -z "$REVIEW_ID_PROVIDER" ]]; then
  echo "  [SKIP] distinct reviewId check skipped — one or both reviewIds missing (Reviews API not yet merged)"
else
  echo "  [FAIL] customer and provider reviewIds should differ"
  FAIL=$((FAIL + 1))
fi

reviews_list_res=$(req GET "/api/v1/bookings/${BOOKING_ID}/reviews" "$CUSTOMER_TOKEN") || true
assert "reviews list returns array" "$reviews_list_res" '"reviewId"'

PROVIDER_USER_ID=$(extract "$provider_signup" "userId") || true
if [[ -n "$PROVIDER_USER_ID" ]]; then
  provider_reviews_res=$(req GET "/api/v1/providers/${PROVIDER_USER_ID}/reviews") || true
  assert "provider public reviews list returns entry" "$provider_reviews_res" '"reviewId"'
else
  # Fall back to session endpoint to get provider userId
  provider_session=$(req GET /api/v1/auth/session "$PROVIDER_TOKEN") || true
  PROVIDER_USER_ID=$(extract "$provider_session" "userId")
  if [[ -n "$PROVIDER_USER_ID" ]]; then
    provider_reviews_res=$(req GET "/api/v1/providers/${PROVIDER_USER_ID}/reviews") || true
    assert "provider public reviews list returns entry" "$provider_reviews_res" '"reviewId"'
  else
    echo "  [SKIP] provider public reviews list — could not resolve providerId"
  fi
fi

# Idempotent re-submit — customer posts same review again → same reviewId
customer_review_replay=$(req POST "/api/v1/bookings/${BOOKING_ID}/reviews" "$CUSTOMER_TOKEN" \
  '{"rating":5,"comment":"Great work"}') || true
REVIEW_ID_REPLAY=$(extract "$customer_review_replay" "reviewId")
assert "idempotent review re-submit returns reviewId" "$customer_review_replay" '"reviewId"'
if [[ -n "$REVIEW_ID_CUSTOMER" && -n "$REVIEW_ID_REPLAY" ]]; then
  assert_eq "idempotent replay returns same reviewId" "$REVIEW_ID_REPLAY" "$REVIEW_ID_CUSTOMER"
fi

# No-auth review submit → 401
unauth_review_status=$(req_status POST "/api/v1/bookings/${BOOKING_ID}/reviews" "" \
  '{"rating":3}') || true
assert_status "no-auth POST /bookings/:id/reviews → 401" "$unauth_review_status" "401"

# ─── Section 8: Milestone 3f — Disputes ──────────────────────────────────────
# NOTE: requires Disputes API merged (Milestone 3f)
echo ""
echo "=== Section 8: Milestone 3f — Disputes (requires Disputes API merged) ==="

# Sign up operator
operator_signup=$(req POST /api/v1/auth/sign-in "" \
  '{"email":"operator-p3e2e@quickwerk.local","role":"operator"}') || true
OPERATOR_TOKEN=$(extract "$operator_signup" "token")
assert "operator sign-in returns token" "$operator_signup" '"token"'
assert_nonempty "operator token non-empty" "$OPERATOR_TOKEN"

# Create a second booking for the dispute test (avoids conflict with review booking)
booking2_res=$(req POST /api/v1/bookings "$CUSTOMER_TOKEN" \
  '{"requestedService":"Phase3 E2E dispute test booking"}') || true
BOOKING2_ID=$(extract "$booking2_res" "bookingId")
assert "second booking created with bookingId" "$booking2_res" '"bookingId"'
assert_nonempty "second bookingId non-empty" "$BOOKING2_ID"

accept2_res=$(req POST "/api/v1/bookings/${BOOKING2_ID}/accept" "$PROVIDER_TOKEN") || true
assert "provider accepts second booking" "$accept2_res" '"accepted"'

complete2_res=$(req POST "/api/v1/bookings/${BOOKING2_ID}/complete" "$PROVIDER_TOKEN") || true
assert "provider completes second booking" "$complete2_res" '"completed"'

# Customer files dispute
dispute_res=$(req POST "/api/v1/bookings/${BOOKING2_ID}/dispute" "$CUSTOMER_TOKEN" \
  '{"category":"quality","description":"Work not completed"}') || true
DISPUTE_ID=$(extract "$dispute_res" "disputeId")
assert "dispute returns disputeId" "$dispute_res" '"disputeId"'
assert_nonempty "disputeId non-empty" "$DISPUTE_ID"
assert "dispute status is open" "$dispute_res" '"open"'

# Operator views pending disputes
pending_disputes_res=$(req GET /api/v1/disputes/pending "$OPERATOR_TOKEN") || true
assert "operator pending disputes contains disputeId" "$pending_disputes_res" '"disputeId"'

# Idempotent re-submit — customer files same dispute again → same disputeId
dispute_replay=$(req POST "/api/v1/bookings/${BOOKING2_ID}/dispute" "$CUSTOMER_TOKEN" \
  '{"category":"quality","description":"Work not completed"}') || true
DISPUTE_ID_REPLAY=$(extract "$dispute_replay" "disputeId")
assert "idempotent dispute re-submit returns disputeId" "$dispute_replay" '"disputeId"'
if [[ -n "$DISPUTE_ID" && -n "$DISPUTE_ID_REPLAY" ]]; then
  assert_eq "idempotent dispute replay returns same disputeId" "$DISPUTE_ID_REPLAY" "$DISPUTE_ID"
fi

# Customer cannot access operator pending disputes → 403
customer_disputes_status=$(req_status GET /api/v1/disputes/pending "$CUSTOMER_TOKEN") || true
assert_status "customer GET /disputes/pending → 403" "$customer_disputes_status" "403"

# No-auth dispute submit → 401
unauth_dispute_status=$(req_status POST "/api/v1/bookings/${BOOKING2_ID}/dispute" "" \
  '{"category":"quality","description":"Unauthorized attempt"}') || true
assert_status "no-auth POST /bookings/:id/dispute → 401" "$unauth_dispute_status" "401"

# ─── Section 9: Summary ───────────────────────────────────────────────────────
summary
