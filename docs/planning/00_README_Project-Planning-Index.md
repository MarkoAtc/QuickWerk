# Handwerker OnDemand Project Planning Index

## Purpose

This planning package translates the source business plan (`Handwerker_OnDemand_Businessplan_Entwicklungsplan.pdf`, version 1.0 dated 2026-01-30) into an actionable delivery blueprint for product, engineering, operations, AI assistants, and executive stakeholders.

It is intended to be used as both:

- a practical implementation guide for the delivery team
- a long-term reference set for governance, prioritization, and scaling

## Source-Derived Baseline

The source plan clearly establishes the following core intent:

- an app-led service marketplace that must be accessible on web, iOS, and Android, with mobile usage expected to dominate
- web serving as both a product access channel and an operational/backend channel
- support for urgent and scheduled service bookings
- searchable provider profiles with verification, pricing, photos, and ratings
- booking lifecycle tracking
- payments, payouts, and business documents such as receipts/invoices

## Important Planning Principle

Where the source plan is vague, optimistic, or logically incomplete, this planning set adds explicit assumptions and recommended corrections. Those items are labeled and consolidated in `07_Risks-Assumptions-Issues-and-Plan-Corrections.md`.

## Recommended Reading Order

### For executives and sponsors

1. `06_Stakeholder-Executive-Summary-and-Progress-Tracking.md`
2. `02_Development-Roadmap-and-Milestones.md`
3. `07_Risks-Assumptions-Issues-and-Plan-Corrections.md`

### For product and project management

1. `01_Project-Overview-and-Architecture.md`
2. `02_Development-Roadmap-and-Milestones.md`
3. `03_Technical-Specifications.md`
4. `06_Stakeholder-Executive-Summary-and-Progress-Tracking.md`

### For engineering and platform teams

1. `01_Project-Overview-and-Architecture.md`
2. `03_Technical-Specifications.md`
3. `04_Team-Guidelines-and-Engineering-Workflow.md`
4. `05_AI-Agent-Instructions-and-Automation-Workflows.md`
5. `08_Implementation-Handoff-and-Docking-Guide.md`
6. `09_Augment-Code-Handoff-2026-03-19.md`
7. `11_Phase1-Completion-Handoff-2026-03-28.md`
8. `12_QuickWerk-Handoff-to-Marko-2026-04-16.md`

### For AI assistants and automation owners

1. `05_AI-Agent-Instructions-and-Automation-Workflows.md`
2. `04_Team-Guidelines-and-Engineering-Workflow.md`
3. `03_Technical-Specifications.md`
4. `07_Risks-Assumptions-Issues-and-Plan-Corrections.md`
5. `08_Implementation-Handoff-and-Docking-Guide.md`
6. `09_Augment-Code-Handoff-2026-03-19.md`
7. `11_Phase1-Completion-Handoff-2026-03-28.md`
8. `12_QuickWerk-Handoff-to-Marko-2026-04-16.md`

## Document Map

### `01_Project-Overview-and-Architecture.md`

- target product model
- recommended platform architecture
- technology stack and key design decisions
- security, privacy, and scalability posture

### `02_Development-Roadmap-and-Milestones.md`

- phased implementation plan
- realistic timeline and team assumptions
- release gates, dependencies, and milestone criteria

### `03_Technical-Specifications.md`

- detailed requirements by module
- API and data model direction
- non-functional requirements and acceptance criteria

### `04_Team-Guidelines-and-Engineering-Workflow.md`

- development standards
- code review and testing expectations
- CI/CD conventions
- operational readiness rules

### `05_AI-Agent-Instructions-and-Automation-Workflows.md`

- safe AI task boundaries
- automation workflows
- prompt and validation patterns
- approval gates and escalation rules

### `06_Stakeholder-Executive-Summary-and-Progress-Tracking.md`

- business case summary
- KPI framework
- reporting cadence
- progress dashboard and governance templates

### `07_Risks-Assumptions-Issues-and-Plan-Corrections.md`

- source-plan inconsistencies and gaps
- delivery and business risks
- corrective recommendations
- open questions requiring sponsor decisions

### `08_Implementation-Handoff-and-Docking-Guide.md`

- latest implementation pass summary
- exact changed files and rationale
- validation evidence snapshot
- explicit next docking point for contributors

### `09_Augment-Code-Handoff-2026-03-19.md`

- compact continuation brief for Augment Code
- current implemented surfaces and data model state
- exact safe next docking point
- guardrails to preserve architecture/scope

### `10_ADR-Persistence-Path-Postgres-Redis-Object-Storage.md`

- locks the backend persistence path (PostgreSQL/PostGIS-ready + Redis + object storage)
- captures deployment compatibility for Vercel app surfaces with external data services
- records ORM/query-layer direction and rationale for the Postgres transition

### `11_Phase1-Completion-Handoff-2026-03-28.md`

- confirms Phase-1 trust-layer exit criteria and delivered verification workflows
- summarizes platform-api, product-app, and admin-web verification surfaces
- captures smoke-test evidence and phase-forward scope boundaries

### `12_QuickWerk-Handoff-to-Marko-2026-04-16.md`

- operational handoff brief for project-responsibility transfer back to Marko
- includes local/remote repo audit, exact re-entry join-point, and continuation sequence
- records Paperclip pause/deactivate status and concrete follow-up actions

## Global Delivery Assumptions

- `A-01` MVP launches in one pilot region before expansion.
- `A-02` MVP focuses on 3 to 5 trade categories with repeat demand and clear service definitions.
- `A-03` MVP follows a cross-platform-first frontend strategy: one shared product-app codebase targets web, iOS, and Android wherever practical.
- `A-04` Payments and payouts are handled through a compliant marketplace payments provider.
- `A-05` The initial product supports both urgent dispatch and scheduled request/quote workflows.
- `A-06` Full nationwide liquidity is not assumed for MVP.
- `A-07` Admin and back-office tooling remain web-first and may stay separate from the shared product-app codebase.

## How To Use This Planning Set

### During discovery

- confirm open questions in `07`
- lock target region, trade categories, and commercial model
- convert roadmap phases into epics and tickets

### During implementation

- use `01` and `03` as the architecture and requirements baseline
- use `04` for workflow, quality, and release discipline
- use `05` to operationalize AI support safely

### During governance

- use `02` for milestone tracking
- use `06` for leadership reporting
- update `07` whenever assumptions change or new risks appear

## Minimum Completion Checklist

- [ ] Pilot geography approved
- [ ] Initial trade categories approved
- [ ] Merchant-of-record and payout model decided
- [ ] Legal and insurance review completed
- [ ] Cross-platform architecture, shared-code boundaries, and stack approved by engineering lead
- [ ] Roadmap and staffing approved by sponsor
- [ ] KPI baseline agreed by leadership
- [ ] AI usage guardrails adopted by the team

## Change Control

- Update this index whenever a planning document is added, renamed, or materially re-scoped.
- Record major scope or architecture changes in an ADR or change log referenced from `01` and `07`.