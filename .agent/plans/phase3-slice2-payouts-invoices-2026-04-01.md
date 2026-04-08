# Phase 3 Slice 2 — Payouts + Invoice/Receipt

**Date:** 2026-04-01
**Branch:** `feature/phase3-slice2-payouts-invoices`
**Base branch:** `main`
**Status:** PLANNED

---

## Issue Draft

**Title:** feat(phase3-slice2): payout record creation + invoice/receipt endpoint (Milestones 3c + 3d)

**Body:**
Phase 3 Slice 2 closes Milestones 3c and 3d from the Phase 3 plan:
- 3c: When a booking payment is captured, create a provider payout record + emit `PayoutCreatedDomainEvent`; expose payout list + detail endpoints
- 3d: Generate a structured invoice/receipt document on booking completion; expose `GET /api/v1/bookings/:id/invoice`

**Acceptance Criteria:**
- [ ] `PayoutRecord`, `PayoutCreatedDomainEvent` types exported from `packages/domain`
- [ ] `InvoiceRecord`, `InvoiceLineItem` types exported from `packages/domain`
- [ ] `PayoutsModule` with `InMemoryPayoutRepository` + `PayoutsService` wired into `AppModule`
- [ ] `InvoicesModule` with `InMemoryInvoiceRepository` + `InvoicesService` wired into `AppModule`
- [ ] `GET /api/v1/providers/me/payouts` returns paginated payout list (provider session required)
- [ ] `GET /api/v1/providers/me/payouts/:id` returns payout detail with settlement reference
- [ ] `GET /api/v1/bookings/:id/invoice` returns structured JSON invoice (customer/provider session)
- [ ] Payment capture flow in `PaymentsService` also triggers payout creation + `PayoutCreatedDomainEvent` emission
- [ ] `payment-captured.worker.ts` extended: stub also triggers invoice generation stub
- [ ] `packages/api-client` exports request builders for all 3 new endpoints
- [ ] `apps/product-app` has payout-state + payout-screen-actions with unit tests
- [ ] All new services have unit tests (vitest, following existing pattern)
- [ ] `pnpm check` passes across workspace
- [ ] `pnpm --filter @quickwerk/platform-api test` passes
- [ ] `pnpm --filter @quickwerk/product-app test` passes

**Labels:** `phase3`, `payments`, `backend`, `feature`

---

## Branch

`feature/phase3-slice2-payouts-invoices`

---

## Milestone 3c — Payout Record Creation

### packages/domain additions

```ts
// Payouts
export type PayoutStatus = 'pending' | 'processing' | 'settled' | 'failed'

export type PayoutRecord = {
  payoutId: string
  providerUserId: string
  bookingId: string
  paymentId: string
  amountCents: number
  currency: string   // ISO 4217, e.g. 'EUR'
  status: PayoutStatus
  settlementRef: string | null
  createdAt: string  // ISO8601
  settledAt: string | null
}

export type PayoutCreatedDomainEvent = {
  type: 'payout.created'
  payoutId: string
  bookingId: string
  providerUserId: string
  amountCents: number
  currency: string
  correlationId: string
  occurredAt: string
}

export type PayoutCreatedWorkerEnvelope = {
  event: PayoutCreatedDomainEvent
  strategy: 'deterministic-exponential-v1'
  attempt: number
  maxAttempts: number
  backoffMs: number
  nextAttemptAt: string
}
```

### services/platform-api additions

**File: `src/payouts/domain/payout.repository.ts`**
```ts
interface PayoutRepository {
  createPayout(input: CreatePayoutInput): Promise<PayoutRecord>
  findPayoutById(payoutId: string): Promise<PayoutRecord | null>
  findPayoutsByProviderUserId(providerUserId: string): Promise<PayoutRecord[]>
  findPayoutByBookingId(bookingId: string): Promise<PayoutRecord | null>
}
```

**File: `src/payouts/infrastructure/in-memory-payout.repository.ts`**
- In-memory map, same pattern as `InMemoryPaymentRepository`
- `createPayout`: generate UUID payoutId, set `status: 'pending'`, `settlementRef: null`

**File: `src/payouts/payouts.service.ts`**
- `createPayoutForCapture(payment: PaymentRecord, providerUserId: string, correlationId: string): Promise<PayoutRecord>`
  - Creates payout record (amount = payment.amountCents, currency = payment.currency)
  - Emits `PayoutCreatedDomainEvent` via `logStructuredBreadcrumb`
  - Idempotent: if payout already exists for bookingId, return existing
- `getMyPayouts(session): Promise<PayoutRecord[]>`
- `getPayoutById(session, payoutId): Promise<PayoutRecord>`

**File: `src/payouts/payouts.controller.ts`**
```text
GET /api/v1/providers/me/payouts      → provider session required
GET /api/v1/providers/me/payouts/:id  → provider session required
```

**File: `src/payouts/payouts.module.ts`**
- Exports `PayoutsService`
- Imports `AuthModule` (session guard)

**Wire into `PaymentsService`:**
- Inject `PayoutsService` into `PaymentsService`
- After successful payment capture in `capturePaymentForBooking()`, call `payoutsService.createPayoutForCapture()`
- The `providerUserId` comes from the booking record (already fetched)

**Tests: `src/payouts/payouts.service.test.ts`**
- `createPayoutForCapture`: happy path, idempotency (same bookingId → same payout), `PayoutCreatedDomainEvent` breadcrumb emitted
- `getMyPayouts`: returns only payouts for requesting provider
- `getPayoutById`: 404 for missing, 403 for wrong provider

---

## Milestone 3d — Invoice/Receipt Generation

### packages/domain additions

```ts
export type InvoiceLineItem = {
  description: string
  quantity: number
  unitAmountCents: number
  totalAmountCents: number
}

export type InvoiceStatus = 'draft' | 'issued' | 'void'

export type InvoiceRecord = {
  invoiceId: string
  bookingId: string
  customerUserId: string
  providerUserId: string
  lineItems: InvoiceLineItem[]
  subtotalCents: number
  taxCents: number          // stub: 0 for now
  totalCents: number
  currency: string
  status: InvoiceStatus
  issuedAt: string | null   // ISO8601
  createdAt: string
  pdfUrl: string | null     // stub: null until PDF generation is wired
}
```

### services/platform-api additions

**File: `src/invoices/domain/invoice.repository.ts`**
```ts
interface InvoiceRepository {
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord>
  findInvoiceByBookingId(bookingId: string): Promise<InvoiceRecord | null>
  findInvoiceById(invoiceId: string): Promise<InvoiceRecord | null>
}
```

**File: `src/invoices/infrastructure/in-memory-invoice.repository.ts`**
- In-memory map
- `createInvoice`: generate UUID invoiceId, set `status: 'issued'`, `issuedAt: now`, `pdfUrl: null`

**File: `src/invoices/invoices.service.ts`**
- `generateInvoiceForBooking(booking, payment, correlationId): Promise<InvoiceRecord>`
  - Line item: `{ description: 'Job: <booking trade category>', quantity: 1, unitAmountCents: payment.amountCents, totalAmountCents: payment.amountCents }`
  - Idempotent: if invoice exists for bookingId, return existing
- `getInvoiceByBookingId(session, bookingId): Promise<InvoiceRecord>`
  - Session must be customer OR provider on the booking

**File: `src/invoices/invoices.controller.ts`**
```text
GET /api/v1/bookings/:id/invoice  → customer or provider session required
```

**File: `src/invoices/invoices.module.ts`**
- Exports `InvoicesService`
- Imports `BookingsModule`, `PaymentsModule`, `AuthModule`

**Wire into `PaymentsService`:**
- Inject `InvoicesService` into `PaymentsService`
- After payout creation, call `invoicesService.generateInvoiceForBooking()`

**Extend `payment-captured.worker.ts`:**
- Add stub log breadcrumb: `payment.captured.worker.invoice-generation.stub` (same pattern as existing DLQ stubs)

**Tests: `src/invoices/invoices.service.test.ts`**
- `generateInvoiceForBooking`: happy path, idempotency, correct line item calculation
- `getInvoiceByBookingId`: 404 for missing, 403 for non-participant

---

## packages/api-client additions

```ts
// Payouts
export const providerPayoutApiRoutes = {
  list: () => '/api/v1/providers/me/payouts',
  detail: (payoutId: string) => `/api/v1/providers/me/payouts/${payoutId}`,
}
export function createGetMyPayoutsRequest(): RequestInit { ... }
export function createGetPayoutDetailRequest(payoutId: string): RequestInit { ... }

// Invoices
export const bookingInvoiceApiRoutes = {
  get: (bookingId: string) => `/api/v1/bookings/${bookingId}/invoice`,
}
export function createGetBookingInvoiceRequest(bookingId: string): RequestInit { ... }
```

---

## apps/product-app additions

**`src/features/payouts/payout-state.ts`**
```ts
type PayoutLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; payouts: PayoutRecord[] }
  | { status: 'error'; message: string }
```

**`src/features/payouts/payout-screen-actions.ts`**
- `loadMyPayouts(apiBase): Promise<PayoutLoadState>`

**Tests:** `payout-state.test.ts`, `payout-screen-actions.test.ts` (same vitest pattern)

---

## Verification Commands

```bash
# Type-check entire workspace
corepack pnpm check

# Platform-API tests (includes new payout + invoice service tests)
corepack pnpm --filter @quickwerk/platform-api test

# Product-app tests (includes new payout state/action tests)
corepack pnpm --filter @quickwerk/product-app test

# Background workers tests
corepack pnpm --filter @quickwerk/background-workers test
```

---

## Patterns to Follow

- Service tests: `services/platform-api/src/payments/payments.service.test.ts`
- Repository pattern: `services/platform-api/src/payments/infrastructure/in-memory-payment.repository.ts`
- Module wiring: `services/platform-api/src/payments/payments.module.ts`
- App state: `apps/product-app/src/features/bookings/booking-state.ts`
- App actions: `apps/product-app/src/features/bookings/booking-screen-actions.ts`
- Worker pattern: `services/background-workers/src/workers/payment-captured.worker.ts`
- logStructuredBreadcrumb: `services/platform-api/src/observability/`

---

## Commit Convention

```text
feat(phase3-slice2): payout record creation + invoice/receipt endpoint (Milestones 3c + 3d)
```

Atomic commit per sub-milestone if needed:
- `feat(platform-api): payout record + PayoutsModule (Milestone 3c)`
- `feat(platform-api): invoice/receipt endpoint + InvoicesModule (Milestone 3d)`
- `feat(api-client+product-app): payout/invoice request builders + app state`
