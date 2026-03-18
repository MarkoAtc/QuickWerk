# Handwerker OnDemand Team Guidelines and Engineering Workflow

## 1. Delivery Principles

- optimize for safe iteration, not heroic release behavior
- keep business-critical workflows observable and testable
- prefer smaller, reviewable changes over large batches
- protect customer trust, provider trust, and financial correctness before feature polish

## 2. Working Model

### Planning cadence

- weekly backlog refinement
- sprint planning every 2 weeks
- architecture review for cross-cutting changes
- weekly risk review using document `07`

### Engineering rituals

- daily async status update in the team channel
- demo at end of each sprint
- incident review after any Sev-1 or Sev-2 issue

## 3. Branching and Source Control

- use trunk-based development with short-lived feature branches
- branch naming: `feat/...`, `fix/...`, `chore/...`, `docs/...`
- commit style: Conventional Commits
- merge only through reviewed pull requests

## 4. Pull Request Standards

### PR checklist

- [ ] scope is small enough to review in under 30 minutes
- [ ] tests added or updated
- [ ] feature flags used where rollout risk exists
- [ ] documentation updated when behavior changes
- [ ] security/privacy implications noted
- [ ] screenshots or recordings attached for user-facing changes

### Review rules

- minimum 1 reviewer for normal changes
- minimum 2 reviewers for payment, auth, or data-retention changes
- no self-approval on protected branches

## 5. Definition of Ready

- problem statement is clear
- acceptance criteria are written
- dependencies and assumptions are named
- design and legal questions are resolved or explicitly deferred
- analytics and audit needs are considered

## 6. Definition of Done

- code merged and deployed to the target environment
- automated tests passing
- monitoring and logging added where relevant
- documentation updated
- rollout and rollback steps known
- no unresolved critical defects in the changed scope

## 7. Code Standards

- TypeScript strict mode enabled
- linting and formatting enforced in CI
- shared domain terminology across code, docs, and tickets
- no business logic in controllers or UI components beyond orchestration
- prefer explicit domain services and state machines for booking/payment flows

### Cross-platform frontend rules

- default to shared product-app code before introducing web-only or native-only forks
- keep the MVP frontend in a monorepo with clear package boundaries for product app, admin web, UI, domain logic, and API clients
- document every intentional platform divergence in the ticket, PR, or ADR
- do not create separate web, iOS, and Android feature implementations unless a real product or technical constraint requires it

### Recommended workspace standard

- use `pnpm` workspaces as the default package-management and linking model
- use `Turborepo` for task orchestration, remote/local caching, and affected-task execution
- keep root folders consistent: `apps/`, `services/`, `packages/`, `infra/`, and `docs/`
- product-facing shared logic must live in `packages/` before being duplicated into multiple apps
- app packages may depend on shared packages; shared packages must not depend on app implementations
- create new packages only when reuse or ownership boundaries are clear; do not over-fragment the repo early

## 8. Testing Standards

### Minimum expected coverage by type

- unit tests for domain logic
- integration tests for persistence and external adapters
- end-to-end smoke tests for critical user journeys
- cross-platform checks for shared UI and workflows on web plus at least one native target during normal development

### Critical flows that always need automated coverage

- provider verification
- search and booking creation
- acceptance and cancellation
- payment capture and payout creation
- dispute and refund handling
- release-candidate smoke testing on web, iOS, and Android before pilot rollout

## 9. CI/CD Workflow

### CI stages

1. install and cache dependencies
2. lint and static checks
3. unit tests, including shared-package tests
4. web build / shared app bundle validation
5. integration tests
6. security and dependency scans
7. build artifacts, containers, and mobile preview builds where applicable

### Workspace CI rules

- prefer affected-task execution for PR validation, but run full release-candidate checks before milestone sign-off
- require `apps/product-app` changes to validate web plus at least one native target in normal CI
- require changes to shared packages to run all dependent app and service checks that the workspace graph marks as affected

### CD stages

1. deploy web previews and development builds automatically on merge
2. deploy staging web app and internal iOS/Android builds from release candidate branch/tag
3. deploy to production with approval gate, release checklist, and platform parity sign-off

### Release rules

- use feature flags for risky functionality
- maintain rollback path for every release
- release notes generated automatically from merged changes

## 10. Environment Management

- development for shared team testing
- staging mirrors production integrations as closely as possible
- production is locked down with change approvals and audit logs
- no manual production hotfixes without immediate follow-up PR
- maintain test coverage across supported device classes and modern browsers used in the pilot

## 11. Security and Privacy Practices

- secrets only from a secret manager
- no personal data in logs unless masked and justified
- use principle of least privilege for IAM and admin tooling
- document retention periods and deletion jobs must be reviewed

## 12. Operational Practices

### Monitoring baseline

- API latency and error rate
- booking funnel conversion
- payment success/failure
- payout delays
- notification delivery failure
- support backlog by SLA bucket

### Incident management

- severity model defined before launch
- on-call owner for pilot period
- postmortem required for severe incidents

## 13. Documentation Expectations

- architecture decisions stored as ADRs
- public APIs documented and versioned
- onboarding steps kept current
- stakeholder-facing milestone changes reflected in `02` and `06`

## 14. AI Collaboration Rules

- AI may draft, analyze, refactor, test, and document within approved scope
- AI may not change production secrets, install dependencies, or alter legal/financial policy without approval
- every AI-generated change must be human-reviewed before production release

## 15. Acceptance Criteria

- [ ] Workflow is compatible with frequent safe releases
- [ ] Quality gates cover core marketplace and payment risks
- [ ] Security and privacy practices are explicit, not implied
- [ ] Engineering process aligns with roadmap and stakeholder reporting
- [ ] Workflow supports one shared product-app codebase across web, iOS, and Android