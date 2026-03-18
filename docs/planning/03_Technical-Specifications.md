# Handwerker OnDemand Technical Specifications

## 1. Specification Scope

This document defines the baseline technical requirements for the Handwerker OnDemand MVP and the immediately adjacent post-MVP hardening scope.

## 1.1 Client Platform Strategy

### Recommended stance

- treat the product delivery model as **cross-platform-first**
- treat the UX and screen-prioritization model as **mobile-first**
- launch the same product app on **web, iOS, and Android** during MVP rather than building three independent client stacks

### Recommended frontend stack

- product app: Expo + React Native + TypeScript
- routing/navigation: Expo Router
- shared web rendering: React Native Web
- data and server-state layer: typed API client + TanStack Query
- form and validation layer: React Hook Form + Zod or equivalent typed schema validation
- admin and operations console: Next.js + React + TypeScript

### Shared by default

- screens and navigation structure
- design tokens and UI primitives
- API client and auth/session handling
- state, hooks, forms, and validation schemas
- analytics events, localization, and booking workflow logic

### Platform-specific only where justified

- push notifications and notification permissions
- deep links and native app linking
- camera, media picker, and device permissions
- maps and geolocation adapters
- browser metadata, SEO-sensitive pages, and web accessibility edge cases
- store packaging, signing, and release automation

### Acceptance criteria

- [ ] shared feature code runs on web, iOS, and Android unless a documented exception exists
- [ ] platform-specific forks are minimized and justified in design notes or ADRs

## 2. Functional Modules

## 2.1 Identity, Access, and Roles

### Requirements

- support customer, provider user, provider admin, support agent, finance user, and platform admin roles
- support email/password plus social or magic-link login if approved by product
- enforce MFA for admin users and provider payout actions
- keep role assignments auditable

### Acceptance criteria

- [ ] unauthorized users cannot access admin or payout flows
- [ ] role changes are logged with actor, timestamp, and reason
- [ ] deleted or suspended accounts cannot authenticate

## 2.2 Provider Onboarding and Verification

### Requirements

- provider organization registration with legal entity data
- trade category assignment and service area setup
- document upload for business license, trade credentials, insurance, and bank details
- verification review queue with approve/reject/request-more-info states

### Acceptance criteria

- [ ] unverified providers cannot receive customer-visible ranking or accept jobs
- [ ] uploaded files are virus scanned and access controlled
- [ ] verification decision trail is retained for audit

## 2.3 Profiles and Offerings

### Requirements

- public provider profile with photos, description, certifications, languages, and ratings
- configurable service categories and subcategories
- price model support for call-out fee, hourly rate, fixed package, or quote-required
- service area definition by radius and optional postal-code coverage

### Acceptance criteria

- [ ] profile changes require moderation if trust-critical fields change
- [ ] customer sees only currently available and verified services
- [ ] inactive offerings are excluded from search

## 2.4 Search and Discovery

### Requirements

- geospatial search by location and radius
- category and subcategory filtering
- filters for availability, verified status, rating, and indicative price
- ranking that prioritizes relevance, proximity, quality, and responsiveness

### Non-functional requirements

- p95 search response below 700 ms in pilot region
- cache hot category/location queries

### Acceptance criteria

- [ ] search results are deterministic for the same query and ranking inputs
- [ ] location fallback exists when exact geocoding fails
- [ ] only providers inside declared service area are returned

## 2.5 Job Request and Booking

### Requirements

- customer can create urgent or scheduled requests
- request captures location, category, notes, photos, preferred time, and contact constraints
- provider can accept, reject, or request clarification
- system must support both direct booking and quote-based acceptance

### Status model

- `draft`
- `submitted`
- `broadcast`
- `accepted`
- `en_route`
- `in_progress`
- `completed`
- `cancelled`
- `disputed`

### Acceptance criteria

- [ ] all state transitions are validated server-side
- [ ] transition history is stored immutably
- [ ] cancellation policy is enforceable by role and state

## 2.6 Matching and Dispatch

### Requirements

- urgent jobs can be broadcast to a qualified provider pool
- scheduled jobs can use quote or acceptance windows
- provider eligibility considers category, distance, verification, rating, and availability
- fairness controls prevent the same small provider subset from receiving all leads

### Acceptance criteria

- [ ] broadcast targeting excludes suspended or unavailable providers
- [ ] matching decisions are explainable in logs
- [ ] no single failed worker can lose a job request without retry or dead-letter handling

## 2.7 Messaging and Notifications

### Requirements

- in-app messaging between customer and provider after controlled booking milestones
- push, email, and SMS notification templates for critical events
- template localization support
- delivery logs and retry strategy

### Acceptance criteria

- [ ] customer PII masking remains active until disclosure rules are met
- [ ] notification failures are visible in operations dashboards
- [ ] support can review message history for disputes subject to privacy rules

## 2.8 Payments, Payouts, and Documents

### Requirements

- payment method capture and authorization
- completion-triggered capture or milestone-based capture if business policy requires
- provider payout after completion and dispute window checks
- invoice/receipt generation for customer and settlement record for provider
- refund and adjustment handling

### Required external behavior

- compliant KYC/KYB where payment provider requires it
- payout reconciliation export for finance
- clear merchant-of-record policy implemented in both UI and legal texts

### Acceptance criteria

- [ ] payment state is consistent with booking state
- [ ] duplicate capture is prevented idempotently
- [ ] every payout is traceable to a completed financial event chain

## 2.9 Ratings, Reviews, and Trust

### Requirements

- two-sided rating support if product chooses it; customer-to-provider is mandatory
- moderation tools for abusive or fraudulent reviews
- trust score inputs from verification status, response time, cancellations, and dispute ratio

### Acceptance criteria

- [ ] only completed jobs can create reviews
- [ ] review edits and removals are audited
- [ ] moderation actions are role restricted

## 2.10 Admin, Support, and Dispute Operations

### Requirements

- admin dashboard for providers, bookings, financial exceptions, and support cases
- manual intervention tools with audit logging
- dispute intake, categorization, SLA routing, and resolution notes
- reporting for blocked payouts, failed verifications, and cancellation hotspots

### Acceptance criteria

- [ ] support agents can operate without direct database access
- [ ] all manual financial overrides require elevated role and reason code
- [ ] dispute status is visible to support and finance roles

## 2.11 Analytics and Reporting

### Required events

- account registration
- provider verification submitted / approved / rejected
- search performed
- provider viewed
- job request created
- request accepted / rejected
- job completed / cancelled / disputed
- payment authorized / captured / failed / refunded
- payout created / paid / blocked

### Acceptance criteria

- [ ] product and financial events share stable identifiers
- [ ] dashboards can segment by region, category, and provider cohort
- [ ] analytics excludes accidental duplicate event ingestion

## 3. Data Design Baseline

### Storage guidance

- PostgreSQL is the system of record for bookings, users, and finance metadata
- documents and media live in object storage with signed URLs
- analytics events flow into a separate product analytics store
- PII retention is separated from operational metrics where feasible

## 4. API Design Rules

- use versioned REST APIs for client-facing endpoints
- use idempotency keys for payment and booking mutation endpoints
- publish domain events for major state changes
- prefer explicit workflow endpoints over generic patch-everything patterns

## 5. Non-Functional Requirements

### Security

- OWASP ASVS-aligned application controls
- secrets never stored in code or client apps
- dependency scanning and container scanning in CI

### Reliability

- background jobs must support retry and dead-letter queues
- backups daily with tested restore runbooks
- graceful degradation when notification vendors fail

### Performance

- mobile critical screens under 3 seconds on standard 4G
- core web-app routes interactive in under 3 seconds on standard broadband/mobile browser conditions
- admin dashboards paginated and filterable
- file upload limit and compression strategy documented

### Compliance

- GDPR-friendly consent and retention rules
- tax/document retention aligned to operating jurisdiction
- legal review for review moderation and provider verification claims

## 6. Test Strategy Requirements

- unit tests for domain logic and state transitions
- integration tests for APIs, payment flows, and queues
- end-to-end smoke tests for customer booking and provider fulfillment
- cross-platform smoke coverage for shared product flows on web, iOS, and Android release candidates
- contract tests for third-party integrations where practical

## 7. Dependencies and Assumptions

- `A-03`: one shared product-app codebase targets web, iOS, and Android for MVP wherever practical
- `A-04`: payment vendor handles regulated payout primitives
- `A-05`: quote-required jobs exist alongside instant jobs
- `A-07`: admin and operations remain web-first even while the product app is cross-platform

## 8. Completion Checklist

- [ ] Each module has backlog stories and owners
- [ ] Acceptance criteria are traceable to tests
- [ ] Payment and legal assumptions are validated externally
- [ ] Observability events are defined before implementation
- [ ] Data retention and deletion policies are documented