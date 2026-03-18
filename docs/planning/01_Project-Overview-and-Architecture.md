# Handwerker OnDemand Project Overview and Architecture

## 1. Product Summary

Handwerker OnDemand is a two-sided service marketplace that connects customers with verified local craftspeople and master trade businesses for urgent and scheduled jobs. The source business plan frames it as an "Uber principle" platform for services, but the implementation model must support both instant requests and scheduled, quote-based work.

## 2. Business Outcome Goals

### Primary goals

- reduce time-to-book trusted local tradespeople
- create a scalable lead and booking channel for verified providers
- standardize booking, status tracking, payout, and document workflows
- build enough marketplace liquidity in a focused launch region to prove unit economics

### Success signals for the first 12 months

- supply-side: active verified providers in target categories
- demand-side: repeat bookings and acceptable acquisition cost
- operational: low cancellation rate and fast first-response time
- financial: positive take-rate contribution before central overhead

## 3. Target User Segments

The source plan clearly implies multiple customer groups. The recommended order is:

1. private households with urgent or routine repair needs
2. small businesses needing fast local service fulfillment
3. property managers and facility-management teams as phase-2 B2B buyers

### Provider segments

- independent certified tradespeople
- small and mid-sized master trade businesses
- approved subcontractor teams with insurance and legal entity verification

## 4. Product Scope

### In scope for MVP

- product web app for customers and providers
- iOS app
- Android app
- admin and operations web console
- location-based search and discovery
- provider verification and profile management
- urgent and scheduled booking flow
- status tracking
- messaging and notifications
- payment authorization, capture, payout, and documents
- ratings, support, and dispute intake

### Out of scope for MVP

- nationwide launch across all trade categories
- custom ERP for providers
- dynamic marketplace surge pricing
- fully autonomous dispatch optimization
- separate bespoke frontend codebases for web, iOS, and Android when the same feature can live in the shared product app

## 5. Architecture Recommendation

## Decision

Use a cloud-native, domain-oriented platform with a **modular service architecture** and a **cross-platform-first frontend strategy** from day one, but avoid unnecessary microservice sprawl or fragmented client codebases before product-market fit.

### Frontend platform stance

- Treat the product as **cross-platform-first**.
- Treat the user experience as **mobile-first**.
- Treat the commercial launch as **app-led but not app-only**: the same product must be available on web, iOS, and Android for MVP.

### Why this is the right compromise

- it is the fastest realistic path to launch all three platforms without tripling frontend effort
- it keeps UX centered on mobile usage while preserving browser access for users who prefer desktop or mobile web
- it avoids the maintenance burden of separate web, iOS, and Android product teams too early
- it still allows a separate web-only admin console for operations-heavy internal workflows

### Shared-codebase boundaries

- shared by default: screens, navigation structure, design tokens, UI primitives, API client, auth/session logic, state, forms, validation, analytics hooks, localization, and booking workflow logic
- platform-specific only where justified: push notifications, deep links, native permissions, camera/media, maps, store packaging, browser SEO/metadata, accessibility edge cases, and dense internal admin tables

### Backend architecture rationale

- the source business plan is ambitious, but a pure microservices estate would slow an early team
- the product still benefits from clear service boundaries because payments, notifications, documents, and matching have distinct operational needs
- this approach supports modern CI/CD, independent scaling of critical services, and future decomposition

## 6. Logical System Design

### User-facing channels

- shared product app delivered on web, iOS, and Android
- admin back office web app

### Core platform services

1. Identity and Access Service
2. Provider Onboarding and Verification Service
3. Marketplace Service
   - categories
   - provider profiles
   - search
   - booking and job lifecycle
4. Matching and Dispatch Worker
5. Messaging and Notification Service
6. Payment, Payout, and Document Service
7. Review and Trust Service
8. Admin, Support, and Reporting Service

### Platform foundation

- API gateway / BFF layer
- event bus for asynchronous workflows
- relational primary database
- geospatial search support
- object storage for media and generated documents
- observability stack

## 7. Recommended Technology Stack

### Frontend

- product app for web, iOS, and Android: Expo + React Native + TypeScript
- routing and navigation: Expo Router across native and web
- web rendering for shared product flows: React Native Web
- admin and operations console: Next.js + React + TypeScript
- shared frontend packages: design system, domain models, API client, auth/session, validation schemas, analytics hooks, and localization

### Recommended monorepo and workspace structure

- workspace manager: `pnpm` workspaces
- task orchestration and caching: `Turborepo`
- repository layout should stay simple and feature-oriented during MVP

#### Top-level structure

- `apps/product-app` — Expo app shipping the shared product experience on web, iOS, and Android
- `apps/admin-web` — Next.js admin, support, and operations console
- `services/platform-api` — NestJS modular backend for MVP, with bounded domains kept modular internally
- `services/background-workers` — async jobs for notifications, matching, payouts, and document generation
- `packages/ui` — shared design tokens, UI primitives, and app-level components
- `packages/domain` — shared domain models, enums, state-machine helpers, and validation schemas
- `packages/api-client` — typed API client, query helpers, and mutation wrappers
- `packages/auth` — shared auth/session utilities and guards
- `packages/analytics` — analytics event definitions and tracking helpers
- `packages/localization` — translations, locale helpers, and formatting utilities
- `packages/config` — shared TypeScript, lint, build, environment, and feature-flag config
- `packages/test-utils` — shared test factories, mocks, and cross-platform test helpers
- `infra/terraform` — cloud infrastructure and environment provisioning
- `docs/planning` — planning, ADR references, and project governance docs

#### MVP structuring rule

- start with one deployable product app, one deployable admin web app, one modular platform API, and one worker service
- extract additional backend deployables only when traffic, compliance, or team autonomy clearly justifies it
- keep shared packages dependency-safe: packages may not depend on app-specific code

### Backend

- services: NestJS with TypeScript
- APIs: REST for synchronous workflows, event-driven integration for async processes
- background jobs: BullMQ or queue workers on Redis/SQS-backed infrastructure

### Data and infrastructure

- PostgreSQL with PostGIS for transactional and geo queries
- Redis for caching, rate limiting, session support, and job queues
- S3-compatible object storage for media and PDFs
- EventBridge or SNS/SQS for domain events and integrations

### Cloud and delivery

- AWS in an EU region, preferably `eu-central-1`
- EAS Build / Submit / Update for iOS and Android build and release automation
- ECS Fargate for containerized services
- CloudFront + WAF for edge security
- RDS PostgreSQL with automated backups
- Secrets Manager and KMS for secret handling and encryption
- Terraform for infrastructure as code
- GitHub Actions for CI/CD

### Third-party integrations

- payments and payouts: Stripe Connect or equivalent EU-compliant marketplace processor
- maps/geocoding: Mapbox or HERE
- transactional messaging: SendGrid/Postmark + SMS provider
- analytics: PostHog or Mixpanel for product analytics
- error monitoring: Sentry

## 8. Data Domains

### Core entities

- user
- provider organization
- provider credential and verification record
- service category
- provider service offering
- location and service area
- job request
- booking / job order
- quote / price proposal
- payment intent
- payout statement
- invoice / receipt
- review and rating
- support case / dispute
- notification event

## 9. Key Architectural Decisions

### AD-01: Pilot-region-first rollout

Rationale: Marketplace liquidity is regional. Launching broadly before local density exists will weaken fulfillment and retention.

### AD-02: Dual booking model

Rationale: The source plan's on-demand positioning is useful for urgent jobs, but many trade jobs require scheduled visits, quote review, or material checks.

### AD-03: Cross-platform-first client delivery

Rationale: One shared product-app codebase is the simplest way to ship web, iOS, and Android together for MVP while keeping long-term maintenance manageable.

### AD-04: Payment and document logic isolated into its own service

Rationale: Compliance, auditing, and reconciliation require stronger boundaries than ordinary CRUD features.

### AD-05: Event-driven status changes

Rationale: Booking, notifications, analytics, payments, and documents should react reliably to state transitions without hard coupling.

### AD-06: Separate internal admin console from the shared product app

Rationale: Back-office workflows often need dense tables, audit tools, and support operations that are better served by a web-only interface.

## 10. Security and Privacy by Default

### Mandatory controls

- role-based access control for customer, provider, support, finance, and admin roles
- MFA for admin accounts and provider finance actions
- encryption in transit and at rest
- least-privilege service accounts and short-lived credentials
- audit logging for login, payout, verification, and dispute actions
- secure file uploads with malware scanning
- GDPR-aligned consent, retention, and deletion workflows

### Privacy posture

- minimize stored personal data
- mask phone and email details until booking conditions are met
- separate operational analytics from PII-heavy production data
- implement data subject request workflows before public launch

## 11. Availability and Scalability Targets

### Initial targets

- public app availability: 99.5% during pilot
- API p95 latency: under 500 ms for standard reads
- search p95 latency: under 700 ms in pilot region
- event processing delay: under 30 seconds for standard notifications

### Scaling approach

- horizontal scaling for stateless APIs and workers
- read replicas only when proven necessary
- cache hot reads and provider discovery results
- extract high-load services only when domain and traffic justify it

## 12. Acceptance Criteria

- [ ] Architecture supports urgent and scheduled jobs
- [ ] Payments, payouts, and documents are isolated and auditable
- [ ] Provider verification is mandatory before accepting jobs
- [ ] Product app can be shipped to web, iOS, and Android from one primary frontend codebase
- [ ] Pilot-region operation is possible without nationwide assumptions
- [ ] CI/CD, observability, and security controls are designed into the baseline
- [ ] Architecture avoids premature complexity while preserving service boundaries

## 13. Dependencies

- payment provider legal onboarding
- insurance and legal entity verification policy
- map and geocoding vendor selection
- sponsor decision on pilot geography and trade categories