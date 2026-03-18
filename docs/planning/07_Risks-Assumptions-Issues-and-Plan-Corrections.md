# Handwerker OnDemand Risks, Assumptions, Issues, and Plan Corrections

## 1. Purpose

This document captures where the source business plan is strong, where it is incomplete, and where it needs corrective planning to be executable.

## 2. Positive Signals From the Source Plan

- clear product concept: trusted marketplace for local trades services
- strong trust orientation: verification, ratings, and documented transactions
- sensible MVP feature direction: search, profiles, booking, tracking, documents
- recognition that both mobile and operational back-office tools are required

## 3. Key Assumptions Added in This Planning Set

- `A-01` Launch is regional first, then expand.
- `A-02` MVP limits categories to those with strong repeat or urgent demand.
- `A-03` One shared product-app codebase targets web, iOS, and Android for MVP wherever practical.
- `A-04` A regulated payments platform handles payout primitives.
- `A-05` The product supports both instant and scheduled/quote flows.
- `A-06` Provider verification is a platform trust process, not a warranty of workmanship.
- `A-07` Internal admin and operations tooling remain web-first and may stay separate from the shared product app.

## 4. Inconsistency and Issue Register

| ID | Issue in source plan | Why it is a problem | Recommended correction |
|---|---|---|---|
| I-01 | "Uber principle" positioning implies pure instant dispatch | Many trade jobs are diagnostic, scheduled, or quote-based | Implement dual-mode booking: urgent dispatch + scheduled quote workflow |
| I-02 | Broad target audience and likely broad category scope | Marketplace liquidity will fail if supply is too thin across too many categories | Launch in one region with 3 to 5 categories |
| I-03 | Full platform scope appears compressed into a single early release | Web, iOS, Android, verification, payments, payouts, docs, support, and admin are too much for a short delivery window if built separately | Use phased 24 to 28 week roadmap with a shared cross-platform product app and pilot gates |
| I-04 | Verification is mentioned, but legal meaning is unclear | Users may misread verification as a guarantee or liability assumption | Define verification scope contractually and operationally |
| I-05 | Pricing appears simplified | Trade work often needs quote-based pricing, not flat marketplace pricing | Support call-out fee, hourly/fixed packages, and quote-required workflows |
| I-06 | Payments/documents are mentioned but compliance model is unspecified | Merchant-of-record, invoicing, tax, and payout obligations can block launch | Decide finance/legal model in phase 0 and use compliant payment vendor |
| I-07 | Support and dispute handling are under-defined | Two-sided marketplaces fail quickly when disputes lack process | Add support operations, SLAs, and dispute workflow before pilot |
| I-08 | Privacy and security are not explicit enough | Location, contact, payout, and business documents create real compliance risk | Add GDPR, audit logging, RBAC, and data minimization controls to baseline |
| I-09 | AI or automation opportunities are not structured | Teams may use AI inconsistently or unsafely | Adopt documented AI guardrails and validation process |
| I-10 | Separate frontend stacks for web, iOS, and Android would increase cost and inconsistency | MVP speed, parity, and maintenance would suffer | Use one shared product-app codebase with documented platform-specific escape hatches |

## 5. Major Risks

## 5.1 Marketplace liquidity risk

If provider density is too low, search results and response times will disappoint customers and poison demand.

### Mitigation

- pre-seed supply before public demand launch
- limit launch region and categories
- prioritize providers with reliable response behavior in ranking

## 5.2 Compliance and finance risk

Payments, payouts, documents, refunds, and retention are not trivial implementation details.

### Mitigation

- decide merchant-of-record model early
- use audited marketplace payments tooling
- review tax/document obligations before pilot

## 5.3 Delivery risk

Trying to build three separate client stacks plus admin, payments, analytics, and nationwide rollout together creates high failure probability.

### Mitigation

- use phased delivery
- keep one shared product-app codebase for web, iOS, and Android
- keep internal admin workflows in a separate web-first tool
- defer nonessential breadth behind flags or later milestones

## 5.4 Reputation and trust risk

If verification language overpromises, or if poor providers enter the marketplace, the brand will be damaged quickly.

### Mitigation

- define verification criteria precisely
- add moderation, fraud review, and provider performance controls
- maintain customer support visibility and dispute resolution

## 5.5 Security and privacy risk

Location, identity, legal docs, bank details, and communications create a meaningful attack and compliance surface.

### Mitigation

- MFA for privileged roles
- encrypted storage and transport
- least-privilege IAM
- retention and deletion workflows

## 6. Unrealistic Timeline Correction

### Original-plan concern

The source plan reads as if the marketplace, trust stack, payment flows, and operational tooling could plausibly arrive in one short, unified build phase.

### Corrected planning position

- realistic internal alpha: around week 13 to 17
- realistic controlled pilot: around week 21
- realistic stabilization and scale-readiness decision: around week 27

## 7. Business Requirement Gaps That Need Sponsor Decisions

1. Which launch city or region is first?
2. Which trade categories are in scope for MVP?
3. Is the platform or the provider the merchant of record?
4. Are provider subscriptions part of MVP, or only commission?
5. What evidence is required for verification in each jurisdiction?
6. What refund/dispute policy is acceptable for both sides?
7. Is B2B property management in MVP or post-pilot?

## 8. Recommended Immediate Actions

- [ ] confirm pilot geography
- [ ] confirm first 3 to 5 categories
- [ ] decide finance/legal transaction model
- [ ] define verification checklist and rejection policy
- [ ] define support operating hours and SLA targets
- [ ] approve shared-codebase boundaries for web vs native behavior
- [ ] approve the staged roadmap rather than broad-scope launch optimism

## 9. Acceptance Criteria

- [ ] All material source-plan gaps are explicitly documented
- [ ] Each major risk has a practical mitigation path
- [ ] Unrealistic assumptions have been corrected into a staged plan
- [ ] Open sponsor decisions are clear and actionable