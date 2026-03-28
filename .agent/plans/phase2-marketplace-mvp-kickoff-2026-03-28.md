# Phase 2 — Marketplace MVP Kickoff Plan

**Date:** 2026-03-28
**Branch:** `feature/phase2-provider-profile-booking-decline`
**Status:** IN PROGRESS

---

## 1. Goals

Phase 2 builds the marketplace loop: customers discover providers, create job requests, and providers respond (accept or decline). At the end of Phase 2 the system supports a real, end-to-end request–response cycle without payments.

Core objectives:
- Customer can create a job request (already done in Phase 1 as `booking`)
- Provider can **decline** a job request (extends Phase 1 booking lifecycle)
- Provider has a **profile** visible to customers (name, trade categories, service area, bio)
- Customer can view/search provider profile list (minimal — by trade category)
- Booking status model extended: `submitted → accepted | declined`
- Notifications: domain events emitted on decline (mirrors `booking.accepted` pattern)
- App layers updated to match new status vocabulary

---

## 2. Scope

### In scope (Phase 2 total — 6 weeks)

1. **Booking decline** — provider can decline a submitted booking (API + domain + app) ✅ **(slice 1 — implemented now)**
2. **Provider profile** — provider sets own public-facing profile (name, bio, trades, service area) ✅ **(slice 1 — implemented now)**
3. **Provider profile discovery** — customer lists and filters providers (by trade category/status) — *next slice*
4. **Booking detail view** — customer/provider can see full booking with provider info — *next slice*
5. **Notification domain events** — `booking.declined` event emitted with background-worker stub — ✅ **(slice 1 — implemented now)**
6. **Email/push notification stubs** — worker handlers for new events — *next slice*

### Out of scope for Phase 2

- File/document upload binary storage (S3/presigned URLs) — Phase 3
- Payments, payouts, invoices — Phase 3
- Ratings and reviews — Phase 3
- Dispute intake — Phase 3
- Provider search with geo/radius filtering — Phase 4
- Real-time push notifications (Expo push / FCM) — Phase 4
- Scheduled vs urgent booking distinction — Phase 3
- Real Postgres persistence (in-memory repository for now; Postgres path exists as `postgres-booking.repository.ts`)

---

## 3. Milestones

| Milestone | Description | Status |
|---|---|---|
| 2a | Booking decline (API + domain + app + worker event) | ✅ Done (this PR) |
| 2b | Provider profile CRUD (API + app) | ✅ Done (this PR) |
| 2c | Provider profile list/filter for customers | Next |
| 2d | Booking–profile linking (provider name on booking detail) | Next |
| 2e | Notification worker handlers (booking.declined) | Next |
| 2f | Phase 2 end-to-end smoke test | Final milestone |

---

## 4. Technical Approach

### Architecture principles (unchanged from Phase 1)

- NestJS module isolation: each domain gets its own module
- Repository pattern: interface + in-memory implementation, Postgres can replace at any time
- App action/state pattern: thin fetch actions + typed state in product-app features
- `packages/api-client` typed request builders for all new endpoints
- `packages/domain` for shared event/type definitions
- Audit log via `logStructuredBreadcrumb` on every state transition

### Slice 1 changes (this PR)

#### platform-api

**Booking domain — extended `BookingStatus`:**
- Add `'declined'` to `BookingStatus` union
- Add `declineSubmittedBooking` to `BookingRepository` interface
- Add `BookingDeclinedDomainEvent` input/result types

**BookingRepository implementation:**
- `InMemoryBookingRepository.declineSubmittedBooking()` — mirrors accept logic with idempotency
- Transition guard: only `submitted` → `declined` allowed (cannot decline an already-accepted booking)

**BookingsService:**
- `declineBooking(session, bookingId)` — provider-only, emits `booking.declined` domain event

**BookingsController:**
- `POST /api/v1/bookings/:bookingId/decline`

**Provider profile domain:**
- `ProviderProfileRepository` interface + in-memory implementation
- Fields: `providerUserId`, `displayName`, `bio`, `tradeCategories`, `serviceArea`, `isPublic`, `createdAt`, `updatedAt`

**ProvidersService:**
- `upsertProfile(session, input)` — provider-only
- `getMyProfile(session)` — provider-only

**ProvidersController:**
- `PUT /api/v1/providers/me/profile`
- `GET /api/v1/providers/me/profile`

#### packages/domain

- `BookingDeclinedDomainEvent` type (mirrors `BookingAcceptedDomainEvent`)
- `BookingDeclinedWorkerEnvelope` type

#### packages/api-client

- `bookingApiRoutes.decline(bookingId)` route helper
- `providerApiRoutes.myProfile` route helpers
- `createDeclineBookingRequest` request builder
- `ProviderProfileBody`, `UpsertProfileBody` types
- `createUpsertProviderProfileRequest`, `createGetMyProviderProfileRequest` builders

#### apps/product-app

- `booking-state.ts` — extend `CreatedBooking.status` to include `'declined'`
- `booking-screen-actions.ts` — add `declineBookingRequest` action
- `provider-state.ts` — add `ProviderProfile` type + profile state
- `provider-screen-actions.ts` — add `loadMyProfile`, `saveMyProfile` actions

#### background-workers

- `booking-declined.worker.ts` — mirrors `booking-accepted.worker.ts` pattern

---

## 5. API Changes (Slice 1)

### New endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/bookings/:bookingId/decline` | provider | Provider declines a submitted booking |
| PUT | `/api/v1/providers/me/profile` | provider | Provider sets/updates their public profile |
| GET | `/api/v1/providers/me/profile` | provider | Provider views their own profile |

### Modified behaviour

- `GET /api/v1/bookings` — `BookingStatus` now includes `'declined'` in response
- `GET /api/v1/bookings/:id` — same

---

## 6. Testing Strategy

- Unit tests for every new service method (vitest, same pattern as `bookings.service.test.ts`)
- Repository tests for in-memory implementations (same pattern as `in-memory-provider-verification.repository.test.ts`)
- App action tests (same pattern as `booking-screen-actions.test.ts`)
- App state tests (same pattern as `booking-state.test.ts`)
- Smoke script updated to include decline flow
- TypeCheck must pass for all touched packages before merge

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `BookingStatus` extension breaks existing tests | All existing tests use `'submitted'`/`'accepted'` — union extension is additive |
| Provider profile vs verification data duplication | Profile is public-facing; verification is compliance-facing — separate domain concepts |
| In-memory repository state loss on restart | Intentional — Postgres path follows `postgres-booking.repository.ts` pattern |
| Background worker for decline event has no real queue | Same pattern as booking.accepted — stub with retry visibility for now |
| Phase 2 scope creep | Slice-by-slice: this PR only adds decline + profile CRUD. Discovery is next PR. |

---

## 8. What Remains After This PR

- Provider profile list endpoint for customer discovery (`GET /api/v1/providers?tradeCategory=...`)
- Booking detail enrichment with provider display name
- `booking.declined` worker handler (notification stub)
- Customer booking list filter by status
- Phase 2 combined smoke test (full customer → provider decline cycle)
