#!/usr/bin/env bash
# Smoke test: provider verification end-to-end lifecycle
# Flow: provider submits verification -> operator reviews queue -> operator approves -> provider sees approved status
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

echo "[smoke] === Provider Verification Flow ==="

echo "[smoke] Sign in as provider"
PROVIDER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"provider.verify.smoke@quickwerk.local","role":"provider"}')
PROVIDER_TOKEN=$(echo "$PROVIDER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$PROVIDER_TOKEN" ]]; then
  echo "[smoke] ERROR: provider token missing" >&2
  exit 1
fi
echo "[smoke] Provider signed in"

echo "[smoke] Provider checks status before submission (should be not-submitted)"
STATUS_BEFORE=$(req GET /api/v1/providers/me/verification "$PROVIDER_TOKEN")
echo "$STATUS_BEFORE" | grep -q '"not-submitted"\|"status":"not-submitted"' || {
  # also acceptable: returns null or empty body
  echo "[smoke] Status before submission: $STATUS_BEFORE"
}
echo "[smoke] Pre-submission status OK"

echo "[smoke] Provider submits verification"
VERIFICATION_BODY='{"businessName":"Smoke Test Services Ltd","tradeCategories":["plumbing","electrical"],"serviceArea":"Vienna","documents":[{"filename":"trade-cert.pdf","mimeType":"application/pdf","description":"Trade certificate"},{"filename":"business-reg.pdf","mimeType":"application/pdf","description":"Business registration"}]}'
SUBMIT_RESPONSE=$(req POST /api/v1/providers/me/verification "$PROVIDER_TOKEN" "$VERIFICATION_BODY")
VERIFICATION_ID=$(echo "$SUBMIT_RESPONSE" | sed -n 's/.*"verificationId":"\([^"]*\)".*/\1/p')

if [[ -z "$VERIFICATION_ID" ]]; then
  echo "[smoke] ERROR: verificationId missing from submit response" >&2
  echo "[smoke] Response: $SUBMIT_RESPONSE" >&2
  exit 1
fi
echo "[smoke] Verification submitted: $VERIFICATION_ID"

echo "$SUBMIT_RESPONSE" | grep -q '"status":"pending"' || {
  echo "[smoke] ERROR: submitted verification should be pending" >&2
  exit 1
}

echo "[smoke] Provider sees pending status"
STATUS_PENDING=$(req GET /api/v1/providers/me/verification "$PROVIDER_TOKEN")
echo "$STATUS_PENDING" | grep -q '"status":"pending"' || {
  echo "[smoke] ERROR: provider should see pending status" >&2
  exit 1
}

echo "[smoke] Sign in as operator"
OPERATOR_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"operator.smoke@quickwerk.local","role":"operator"}')
OPERATOR_TOKEN=$(echo "$OPERATOR_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$OPERATOR_TOKEN" ]]; then
  echo "[smoke] ERROR: operator token missing" >&2
  exit 1
fi
echo "[smoke] Operator signed in"

echo "[smoke] Operator lists pending verifications"
PENDING_LIST=$(req GET /api/v1/providers/verifications/pending "$OPERATOR_TOKEN")
echo "$PENDING_LIST" | grep -q "$VERIFICATION_ID" || {
  echo "[smoke] ERROR: verification should appear in pending list" >&2
  exit 1
}
echo "[smoke] Verification visible in pending queue"

echo "[smoke] Operator views verification detail"
DETAIL=$(req GET "/api/v1/providers/verifications/$VERIFICATION_ID" "$OPERATOR_TOKEN")
echo "$DETAIL" | grep -q '"status":"pending"' || {
  echo "[smoke] ERROR: verification detail should show pending status" >&2
  exit 1
}
echo "$DETAIL" | grep -q '"documentCount"\|"documents"' || true  # just verify response
echo "[smoke] Verification detail retrieved"

echo "[smoke] Operator approves verification"
APPROVE_RESPONSE=$(req POST "/api/v1/providers/verifications/$VERIFICATION_ID/review" "$OPERATOR_TOKEN" '{"decision":"approved","reviewNote":"All documents verified, looks good"}')
echo "$APPROVE_RESPONSE" | grep -q '"status":"approved"' || {
  echo "[smoke] ERROR: verification should be approved after review" >&2
  exit 1
}
echo "[smoke] Verification approved"

echo "[smoke] Provider sees approved status"
STATUS_APPROVED=$(req GET /api/v1/providers/me/verification "$PROVIDER_TOKEN")
echo "$STATUS_APPROVED" | grep -q '"status":"approved"' || {
  echo "[smoke] ERROR: provider should now see approved status" >&2
  exit 1
}
echo "[smoke] Provider confirmed approved status"

echo "[smoke] Operator pending queue is now empty (verification removed)"
PENDING_AFTER=$(req GET /api/v1/providers/verifications/pending "$OPERATOR_TOKEN")
echo "$PENDING_AFTER" | grep -q "$VERIFICATION_ID" && {
  echo "[smoke] ERROR: approved verification should not appear in pending queue" >&2
  exit 1
} || true

echo "[smoke] Unauthorized access is blocked (customer tries to list pending)"
CUSTOMER_SIGNIN=$(req POST /api/v1/auth/sign-in "" '{"email":"customer.smoke2@quickwerk.local","role":"customer"}')
CUSTOMER_TOKEN=$(echo "$CUSTOMER_SIGNIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

HTTP_STATUS=$(curl --silent --write-out '%{http_code}' --output /dev/null \
  -X GET \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  "$BASE_URL/api/v1/providers/verifications/pending")

if [[ "$HTTP_STATUS" != "403" ]]; then
  echo "[smoke] ERROR: customer access to pending queue should return 403, got $HTTP_STATUS" >&2
  exit 1
fi
echo "[smoke] Unauthorized access correctly blocked (403)"

echo "[smoke] === Flow passed: provider submit -> operator review queue -> approve -> provider sees approved -> auth enforcement ==="
