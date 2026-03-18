# Handwerker OnDemand Development Roadmap and Milestones

## 1. Planning Horizon

This roadmap assumes a realistic first public pilot in **24 to 28 weeks**, not a compressed launch in a few weeks. That timeline is based on the actual complexity implied by the source plan: two-sided marketplace behavior, provider verification, payments, payouts, documents, three-platform client delivery, and operational support. The simplifying assumption is that web, iOS, and Android are shipped from one shared product-app codebase wherever practical.

## 2. Recommended Team Model

### Core delivery team

- 1 product owner / delivery lead
- 1 technical lead / solution architect
- 2 full-stack product engineers
- 1 cross-platform app engineer
- 1 QA / automation engineer
- 1 designer part-time
- 1 DevOps/platform engineer part-time

### Commercial and operations support

- 1 provider acquisition lead
- 1 customer support / operations lead
- legal and finance support on demand

## 3. Phase Overview

### Phase 0: Discovery, validation, and setup

Duration: 3 weeks

#### Objectives

- lock pilot geography and initial trade categories
- validate commercial model and provider onboarding rules
- finalize cross-platform app strategy, architecture, compliance, and success metrics
- establish repository, environments, CI/CD, and delivery process

#### Deliverables

- approved product scope and platform strategy
- delivery backlog and release plan
- infrastructure baseline
- shared app shell and package structure baseline
- data privacy and legal decision log

#### Exit criteria

- [ ] sponsor approves scope and assumptions
- [ ] pilot category and region list signed off
- [ ] legal review for payment and verification model completed
- [ ] shared product app runs on web, iOS, and Android from one codebase

### Phase 1: Foundation and trust layer

Duration: 4 weeks

#### Objectives

- build identity, roles, and access controls
- implement provider onboarding and verification workflow
- establish shared design system and cross-platform app shells
- stand up admin console foundation

#### Deliverables

- auth and account management on web, iOS, and Android
- provider registration and document upload
- verification review queue
- base observability and audit logging

#### Exit criteria

- [ ] verified provider can be created end to end
- [ ] admin can review and approve provider documents
- [ ] audit trail exists for all verification actions
- [ ] shared auth and onboarding flows work on web, iOS, and Android

### Phase 2: Marketplace MVP core

Duration: 6 weeks

#### Objectives

- implement search, provider discovery, job request creation, and booking lifecycle
- support urgent and scheduled requests
- enable notifications and provider response flow across all three client platforms

#### Deliverables

- customer search and category flow
- provider profile and service area setup
- booking statuses and assignment model
- email/push/SMS notification workflows

#### Exit criteria

- [ ] customer can find providers by category and location
- [ ] provider can accept or decline a job request
- [ ] job status changes trigger notifications and audit events
- [ ] MVP booking flow reaches functional parity on web, iOS, and Android for pilot scope

### Phase 3: Payment, payout, and document workflows

Duration: 4 weeks

#### Objectives

- implement marketplace payment flows
- add invoice/receipt and settlement generation
- complete ratings, issue reporting, and dispute intake

#### Deliverables

- payment authorization and capture
- provider payout workflow
- receipt/invoice generation
- review and support case intake

#### Exit criteria

- [ ] successful completed job results in payment capture
- [ ] provider receives payout record and settlement reference
- [ ] customer receives compliant job document

### Phase 4: Pilot launch readiness

Duration: 4 weeks

#### Objectives

- run internal alpha and controlled external pilot
- test support operations, incident handling, and analytics
- harden security, release channels, and performance for public pilot

#### Deliverables

- staging-to-production release pipeline
- web deployment plus iOS/Android pilot release pipelines
- support playbooks and incident contacts
- pilot KPI dashboard
- seeded provider and customer pilot cohort

#### Exit criteria

- [ ] pilot environment stable for 2 consecutive weeks
- [ ] critical severity defects closed or mitigated
- [ ] support SLAs staffed and tested
- [ ] web, iOS, and Android release channels are validated for pilot users

### Recommended MVP development sequence

1. establish the monorepo, shared packages, and one cross-platform product-app shell
2. deliver auth, roles, onboarding, and provider verification as shared flows first
3. deliver search, booking, messaging, and status tracking as shared product features
4. add the minimum platform-specific integrations: push, deep links, camera/file upload, store packaging, and web accessibility/metadata
5. harden release automation and pilot all three platforms together, using feature flags only for low-value edge cases

### Recommended workspace rollout by milestone

#### M0: repository and platform foundation

- create `apps/product-app`, `apps/admin-web`, `services/platform-api`, and `services/background-workers`
- create `packages/ui`, `packages/domain`, `packages/api-client`, `packages/config`, and `packages/test-utils`
- set up `infra/terraform`, preview deployments, CI caching, and shared environment handling

#### M1: trust and onboarding layer

- implement auth/session and role boundaries in `services/platform-api` and `packages/auth`
- build shared sign-in, sign-up, onboarding, and provider verification flows in `apps/product-app`
- build verification review and support views in `apps/admin-web`
- keep shared copy, validation, and UI logic in `packages/ui`, `packages/domain`, and `packages/localization`

#### M2: marketplace and booking MVP

- implement search, provider discovery, and booking APIs in `services/platform-api`
- implement matching, notifications, and lifecycle jobs in `services/background-workers`
- expose booking flows in `apps/product-app` across web, iOS, and Android from the same feature modules
- centralize analytics and query/mutation logic in `packages/analytics` and `packages/api-client`

#### M3: payments, payouts, and operational controls

- add financial workflows and document orchestration in `services/platform-api` and `services/background-workers`
- expose payment state, receipts, and provider payout visibility in `apps/product-app`
- add finance/support exception handling in `apps/admin-web`
- keep financial state models and idempotency helpers in `packages/domain`

#### M4: pilot hardening and release readiness

- lock release channels for `apps/product-app` on web, iOS, and Android
- finalize admin/support production workflows in `apps/admin-web`
- harden observability, feature-flag rollout, and environment automation in `packages/config` and `infra/terraform`
- run cross-platform smoke validation against the same shared product feature set

### Phase 5: Stabilization and scale preparation

Duration: 6 to 7 weeks

#### Objectives

- improve conversion, reliability, and marketplace operations
- prepare B2B property-management workflows
- validate unit economics before expansion

#### Deliverables

- funnel analytics and optimization backlog
- provider performance scorecards
- improved search ranking and trust signals
- phase-2 commercial expansion plan

#### Exit criteria

- [ ] pilot KPIs meet minimum thresholds
- [ ] expansion decision backed by verified marketplace data

## 4. Milestone Timeline

| Milestone | Week | Outcome |
|---|---:|---|
| M0 | 3 | Scope, cross-platform strategy, and legal assumptions approved |
| M1 | 7 | Shared app shell and trust/onboarding layer complete |
| M2 | 13 | Web, iOS, and Android booking MVP usable end to end |
| M3 | 17 | Payments, payouts, and documents operational |
| M4 | 21 | Controlled pilot launch ready on web, iOS, and Android |
| M5 | 27 | Pilot stabilization and scale decision |

## 5. Release Strategy

### Release train

- weekly internal releases to development
- biweekly releases to staging
- controlled production releases behind feature flags
- no Friday production releases unless emergency fix

### Environments

- local
- shared development
- staging
- production

## 6. Dependencies

- payment vendor account approval
- app store accounts and release credentials
- web domain, hosting, and preview deployment setup
- legal position on invoicing, payouts, and dispute handling
- provider acquisition pipeline ready before pilot
- support staff available before external launch

## 7. Risks to the Timeline

### Major schedule risks

- underestimating payment and payout compliance work
- trying to launch too many service categories at once
- splitting into separate web, iOS, and Android product codebases too early
- unclear merchant-of-record model
- insufficient provider density before pilot launch

### Schedule correction policy

- defer feature breadth before compressing QA
- keep pilot geography narrow rather than launching broad and weak
- prefer shared implementation over platform-divergent customization during MVP
- move lower-value features behind flags instead of blocking release

## 8. Milestone Checklists

### Before pilot launch

- [ ] provider verification SLA defined
- [ ] dispute and refund policy approved
- [ ] incident response owner assigned
- [ ] dashboards live for bookings, cancellations, and payment errors
- [ ] legal texts and privacy flows reviewed
- [ ] backup and restore tested
- [ ] web deployment and iOS/Android pilot builds validated on target devices

### Before scale decision

- [ ] supply activation rate measured
- [ ] median time-to-first-response acceptable
- [ ] repeat booking data available
- [ ] category-level economics reviewed
- [ ] support volume within staffing limits

## 9. Acceptance Criteria

- [ ] Roadmap matches actual delivery complexity
- [ ] Milestones depend on measurable gates, not calendar optimism
- [ ] Timeline aligns with staffing assumptions
- [ ] Pilot launch occurs only after compliance and support readiness
- [ ] Expansion is data-driven, not assumption-driven