# Phase 1 Completion Handoff — 2026-03-28

## Status: COMPLETE ✅

Phase 1 exit criteria are now fully met. This document summarizes what was delivered, the test evidence, and the remaining boundaries before Phase 2.

---

## Phase 1 Exit Criteria — Mapping

| Criterion | Status | Evidence |
|---|---|---|
| Verified provider can be created end to end | ✅ | Smoke script + service tests |
| Admin can review and approve provider documents | ✅ | `POST /api/v1/providers/verifications/:id/review` |
| Audit trail exists for all verification actions | ✅ | `statusHistory` on `ProviderVerificationRecord` + structured logs |
| Shared auth and onboarding flows work | ✅ | product-app onboarding state + actions |

---

## What Was Delivered in This Pass

### 1. platform-api — Provider Verification Module

**New files:**
- `src/providers/domain/provider-verification.repository.ts` — Repository interface + types
- `src/providers/infrastructure/in-memory-provider-verification.repository.ts` — In-memory implementation (same pattern as bookings)
- `src/providers/infrastructure/provider-verification-repository.provider.ts` — NestJS provider factory
- `src/providers/providers.service.ts` — Business logic with role guards and structured audit logging
- `src/providers/providers.controller.ts` — REST endpoints
- `src/providers/providers.module.ts` — NestJS module

**Registered in:** `src/app.module.ts`

**API endpoints:**

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/providers/me/verification` | provider | Submit onboarding verification |
| GET | `/api/v1/providers/me/verification` | provider | Get own verification status |
| GET | `/api/v1/providers/verifications/pending` | operator | List all pending verifications |
| GET | `/api/v1/providers/verifications/:id` | operator | View specific verification |
| POST | `/api/v1/providers/verifications/:id/review` | operator | Approve or reject |

**Role access controls:**
- Provider: submit own docs, view own status only
- Operator: list queue, view details, approve/reject
- Customer/unauthorized: 403 or 401

**Audit trail:** Every verification lifecycle action (submit, approve, reject) is recorded in:
1. `ProviderVerificationRecord.statusHistory[]` — Immutable event log per record
2. `logStructuredBreadcrumb()` — Structured JSON logs with correlationId, actorUserId, decision

**vitest config added:** `vitest.config.ts` to exclude `dist/` (fixes pre-existing test runner issue)

---

### 2. packages/api-client

**Extended `src/index.ts` with:**
- `providerApiRoutes` — Typed URL helpers for all verification endpoints
- `SubmitVerificationBody`, `ReviewVerificationBody`, `VerificationStatus` types
- `createSubmitVerificationRequest`, `createGetMyVerificationStatusRequest`, `createListPendingVerificationsRequest`, `createGetVerificationRequest`, `createReviewVerificationRequest` request builders

---

### 3. apps/product-app — Provider Onboarding Flow

**New files:**
- `src/features/provider/onboarding-state.ts` — Typed state machine for verification lifecycle (checking, not-submitted, submitting, pending, approved, rejected, error)
- `src/features/provider/onboarding-screen-actions.ts` — Fetch actions: `loadOnboardingStatus`, `submitOnboarding`, `fetchVerificationStatus`, `submitVerificationRequest`

**Pattern:** follows same thin-vertical action/state approach as existing booking and provider flows.

---

### 4. apps/admin-web — Verification Queue

**New files:**
- `src/features/provider-review/verification-queue-state.ts` — Typed state: loading, empty, loaded, error + `applyReviewDecision`
- `src/features/provider-review/verification-queue-actions.ts` — Actions: `loadQueueState`, `submitReviewDecision`, `loadPendingVerifications`, `reviewVerification`

**Added:** `@quickwerk/api-client` workspace dependency, `vitest` dev dependency, `test` npm script, `vitest.config.ts`

---

### 5. Smoke Script

**New:** `scripts/smoke/provider-verification-flow-smoke.sh`

Tests full end-to-end lifecycle against a live server:
1. Provider signs in
2. Provider checks status (not-submitted)
3. Provider submits verification with document metadata
4. Provider sees pending status
5. Operator signs in
6. Operator lists pending queue (finds the record)
7. Operator views detail
8. Operator approves
9. Provider sees approved status
10. Pending queue no longer contains record
11. Customer access to queue returns 403

Run with: `QW_PLATFORM_API_BASE_URL=http://127.0.0.1:3101 bash scripts/smoke/provider-verification-flow-smoke.sh`

---

## Test Results

```text
platform-api: 19 test files passed (21 total, 2 skipped Postgres integration) | 99 tests
  - includes: 10 provider repo tests + 16 provider service tests (26 new)

product-app: 12 test files passed | 72 tests
  - includes: 11 onboarding-state tests + 12 onboarding-screen-actions tests (23 new)

admin-web: 1 test file passed | 7 tests (new - admin-web had no tests before)
```

All typechecks pass: platform-api, product-app, admin-web, api-client.

---

## Architecture Boundaries Preserved

- No changes to booking flow, auth flow, or existing modules
- Repository pattern maintained throughout (same as bookings)
- NestJS module isolation preserved
- Shared packages (api-client) used for request builders — no raw URLs in app code
- Audit logging uses existing `logStructuredBreadcrumb` pattern with correlationIds
- In-memory repository — same persistence strategy as bookings (Postgres path can follow the same pattern as `postgres-booking.repository.ts`)

---

## Phase 2 Handoff Notes

The following is **not** in Phase 1 scope but ready to build on:

- **File storage:** Documents are metadata-only (filename, mimeType). Actual binary upload requires S3/GCS/MinIO integration — suggested path: add a `POST /api/v1/providers/me/verification/documents/upload-url` endpoint that returns a presigned URL, keeping metadata persistence here.
- **Provider re-submission:** Rejected providers can resubmit (current: conflict returns 409 for pending; after rejection the path allows new submission — not yet explicitly tested).
- **Email notifications:** When status changes (pending, approved, rejected), send provider notification email — wired via domain events / background-workers.
- **Postgres repository:** Follow the same pattern as `postgres-booking.repository.ts` to add `postgres-provider-verification.repository.ts` for production persistence.
