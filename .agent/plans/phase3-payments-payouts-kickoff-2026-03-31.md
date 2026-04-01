# Phase 3 — Payments, Payouts & Document Workflows Kickoff Plan

**Date:** 2026-03-31
**Status:** IN PROGRESS — Phase 3 Slice 1 delivered (commit dd81915)
**Target duration:** 4 weeks

---

## 1. Phase 3 Goals

Phase 3 closes the financial and trust loop. A completed job must produce:
- a payment captured from the customer
- a payout record for the provider
- a compliant invoice/receipt document

Secondary goals:
- providers and customers can leave reviews after a completed job
- disputes and issues can be reported and queued for operator review
- verification document uploads are backed by real file storage (S3)

Phase 3 exit criteria:
- [ ] Successful completed job results in payment capture
- [ ] Provider receives payout record and settlement reference
- [ ] Customer receives a compliant job document (invoice/receipt)
- [ ] Post-job review can be submitted and read back
- [ ] File upload for provider verification uses presigned URLs (not just schema)

---

## 2. Scope

### In scope

1. **Payments** — customer authorizes payment when creating/accepting a booking; captured on job completion
2. **Payouts** — provider payout record created on capture; settlement reference issued
3. **File uploads** — S3/GCS presigned URL generation for provider verification documents
4. **Ratings & reviews** — customer and provider submit a star rating + text review post-job
5. **Dispute intake** — customer or provider reports an issue; support case queued for operator
6. **Invoice/receipt** — PDF or structured document generated for customer + provider on completion

### Out of scope for Phase 3

- Real Stripe/Square live credentials (use test mode / sandbox keys)
- Real S3 bucket provisioning (use LocalStack for dev, stub for CI)
- Full dispute resolution workflow (intake only — resolution is Phase 4+ ops tooling)
- Review moderation (intake only — moderation is Phase 4+ ops tooling)
- Scheduled vs urgent booking distinction (Phase 3+)
- Real-time push notifications (Phase 4)
- Geo/radius provider search (Phase 4)
- IaC / Terraform (Phase 4)

---

## 3. Proposed Slice Breakdown

| Milestone | Slice | Description |
|---|---|---|
| 3a | Slice 1 | Payment intent creation on booking submit + domain event |
| 3b | Slice 1 | File upload presigned URL endpoint for verification documents |
| 3c | Slice 2 | Payment capture on booking completion + payout record creation |
| 3d | Slice 2 | Invoice/receipt generation endpoint (structured JSON + PDF stub) |
| 3e | Slice 3 | Ratings & reviews — submit + read back (API + product-app screens) |
| 3f | Slice 3 | Dispute intake endpoint + operator queue (API + admin-web) |
| 3g | Slice 4 | Phase 3 end-to-end smoke test + Phase 3 completion |

---

## 4. New API Endpoints (planned)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/bookings/:id/complete` | provider | Mark job complete, trigger payment capture |
| GET | `/api/v1/bookings/:id/payment` | customer/provider | Payment status for booking |
| GET | `/api/v1/providers/me/payouts` | provider | List payout records |
| GET | `/api/v1/providers/me/payouts/:id` | provider | Payout detail + settlement ref |
| POST | `/api/v1/providers/me/verification/upload-url` | provider | Request presigned upload URL |
| POST | `/api/v1/bookings/:id/reviews` | customer/provider | Submit post-job review |
| GET | `/api/v1/bookings/:id/reviews` | customer/provider | Fetch reviews for booking |
| GET | `/api/v1/providers/:id/reviews` | public | Public provider reviews |
| POST | `/api/v1/bookings/:id/dispute` | customer/provider | Submit dispute/issue report |
| GET | `/api/v1/disputes/pending` | operator | Operator dispute queue |
| POST | `/api/v1/disputes/:id/resolve` | operator | Operator dispute resolution |
| GET | `/api/v1/bookings/:id/invoice` | customer/provider | Fetch invoice/receipt document |

---

## 5. New Domain Types Needed (packages/domain)

```ts
// Payments
PaymentStatus: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'
PaymentRecord: { paymentId, bookingId, customerUserId, amountCents, currency, status, ... }
PaymentCapturedDomainEvent

// Payouts
PayoutRecord: { payoutId, providerUserId, bookingId, amountCents, currency, settlementRef, ... }
PayoutCreatedDomainEvent

// Reviews
ReviewRecord: { reviewId, bookingId, authorUserId, targetUserId, rating (1-5), body, ... }

// Disputes
DisputeRecord: { disputeId, bookingId, reporterUserId, category, description, status, ... }
DisputeStatus: 'open' | 'under-review' | 'resolved' | 'closed'

// File uploads
UploadUrlRecord: { uploadId, providerUserId, presignedUrl, expiresAt, filename, mimeType }
```

---

## 6. New Database Migrations Needed

```sql
-- 0006_payments.sql          — payments table
-- 0007_payouts.sql           — payouts table
-- 0008_reviews.sql           — reviews table
-- 0009_disputes.sql          — disputes table
-- 0010_upload_tokens.sql     — file upload tracking table
```

---

## 7. New Background Workers Needed

- `payment-captured.worker.ts` — triggers payout record creation + invoice generation
- `dispute-submitted.worker.ts` — routes to operator queue + sends acknowledgement stub

---

## 8. Architecture Notes

### Payments (Stripe test mode)
- Use `stripe` Node SDK with `STRIPE_SECRET_KEY` env var
- Payment intent created at booking submit time
- Captured server-side on `POST /bookings/:id/complete`
- Stripe webhook handler for async capture confirmation (`/webhooks/stripe`)
- In-memory payment repository for dev; Postgres-backed for staging/prod

### File Uploads (S3 presigned URLs)
- Presigned POST URL generated by platform-api using `@aws-sdk/s3-request-presigner`
- Client uploads directly to S3 (no proxying through platform-api)
- Upload token stored in DB with TTL; verified on verification submit
- LocalStack for local dev (`STORAGE_MODE=localstack`)

### Reviews
- Submitted only after booking reaches `completed` status
- One review per (bookingId, authorUserId) — idempotent upsert
- Rating stored as integer 1–5; aggregated on `GET /providers/:id/reviews`

### Dispute Intake
- Any party on a booking can file a dispute
- Dispute is queued for operator review (mirrors verification queue pattern)
- Operator sees disputes alongside verifications in admin-web

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stripe test mode API latency adds flakiness to smoke tests | Use `stripe.mock` or deterministic test stubs in CI |
| S3 presigned URL expiry edge cases | Short TTL (15 min) + re-request flow in app |
| Payout + payment amounts need to match | Store amounts in cents (integer), never floats |
| Invoice PDF generation requires layout tooling | Start with structured JSON; PDF generation can be a later micro-task |
| File upload binary storage costs in dev | LocalStack S3 for local; test bucket with lifecycle rule in staging |

---

## 10. Recommended First Slice

Start with **Slice 1: Payment intent + file upload presigned URL** — these are the two highest-value, lowest-dependency items. Both follow the existing repository + service + controller pattern exactly. Neither requires background workers in the first pass.

Slice 1 endpoint targets:
- `POST /api/v1/bookings/:id/complete` — triggers payment capture domain event
- `POST /api/v1/providers/me/verification/upload-url` — returns presigned URL
- `packages/domain` updates for `PaymentRecord`, `PaymentStatus`, `UploadUrlRecord`
- `packages/api-client` request builders for both
- Unit tests following existing booking/provider service test patterns
- Smoke script: `scripts/smoke/phase3-slice1-complete-upload-smoke.sh`