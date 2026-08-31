# Plan — #73 Inventory messenger and secondary-surface migration work

## Issue and scope

- **Issue:** [#73](https://github.com/MarkoAtc/QuickWerk/issues/73)
- **Parent:** Refs #55
- **Branch:** `codex/feature/73-route-inventory`
- **Scope:** Read-only inventory of the product-app routes not covered by #56, #58, #60, #62, #67, or #69. This slice creates bounded remediation candidates; it does not redesign a screen or change a product contract.

## Acceptance criteria

- [x] Every product-app route is assigned to a shipped child issue, a verified shell baseline, or a bounded remediation candidate.
- [x] Messenger and secondary/public surfaces are split into independently reviewable candidates.
- [x] Each remediation candidate uses the #55 viewport contract: 320, 360, 390, 430, and 1024 px; no page overflow, clipped controls, unreadable wrapping, or unreachable primary actions.
- [x] #55 is updated with the inventory result and the created child issues.

## Risk / TDD classification

`low-risk/docs` — this task changes planning evidence only. Substitute proof is a route-to-issue comparison against the merged child-plan scopes and a review of every route module under `apps/product-app/app`.

## Route inventory

| Routes/surfaces | Assignment | Evidence |
|---|---|---|
| `/_layout`, `/`, `/auth`, `/auth-provider` | #56, shared entry/auth baseline | #56 explicitly covers the shell plus `/auth` and `/auth-provider`; `/` is only a session redirect. |
| `/home-triage`, `/categories`, `/discovery`, `/provider-detail` | #58 | #58 names all four routes and their responsive states. |
| `/booking-wizard`, `/booking`, `/checkout` | #60 | #60 is the bounded booking/payment route group. |
| `/active-job`, `/booking-completion`, `/review` | #62 | #62 is the active/post-job group. |
| `/provider-onboarding`, `/provider-profile` | #67 | #67 completion evidence covers both routes. |
| `/provider`, `/payouts` | #69 | #69 completion evidence covers the provider workspace and payouts. |
| `/sign-in` | Candidate A: secondary authentication surface | This distinct route is not named in #56 and must not be assumed covered by provider/OTP auth work. |
| `/marketplace-preview` | Candidate B: public marketplace preview | This distinct public/secondary route is not covered by #58’s authenticated discovery scope. |
| `/messenger` | Candidate C: booking messenger | This is a distinct, stateful booking surface and the approved `design/messenger` target deserves isolated scope. |

## Candidate issue breakdown

### Candidate A — Audit and repair sign-in route responsiveness

- **Boundary:** `app/sign-in.js` and its existing auth presentation dependencies only.
- **Preserve:** auth/session behavior, credential request payloads, redirects, role handling, and API contracts.
- **Acceptance evidence:** focused browser QA at the #55 viewport matrix for loading, validation/error, long-copy, keyboard, and primary-action states; no horizontal overflow or clipped/reachable controls.

### Candidate B — Audit and repair marketplace-preview responsiveness

- **Boundary:** `app/marketplace-preview.js` and its existing presentation dependencies only.
- **Preserve:** public discovery behavior, navigation, provider data semantics, and backend/API contracts.
- **Acceptance evidence:** focused browser QA at the #55 viewport matrix for loading, empty, long-content, and primary-navigation states; no overflow, collision, or inaccessible action.

### Candidate C — Audit and repair booking messenger responsiveness and parity

- **Boundary:** `app/messenger.js`, `src/features/booking/messenger-screen.*`, and narrowly shared presentation helpers only.
- **Preserve:** booking identifier semantics, participant authorization, message data behavior, navigation, API/client contracts, and data-retention policy.
- **Acceptance evidence:** focused browser QA at the #55 viewport matrix for no-conversation, long-thread, long-message, composer/keyboard, sending/error, and navigation-back states; no overflow, clipped composer, or inaccessible send/navigation control.

## Validation Contract

### Assertions

- [ ] All 21 current route modules are assigned in the inventory table.
- [ ] No prior child issue is credited with a route outside its recorded scope.
- [ ] Each remaining candidate has explicit route boundaries, non-goals, preserved interfaces, and viewport/browser assertions.
- [ ] The parent tracker receives links to the inventory and each created child issue.

### Performance bounds

`N/A —` inventory and issue-tracking work adds no runtime code, network requests, listeners, or assets.

### Interface contracts

`N/A —` no product-app, backend, API-client, domain, auth, authorization, payment, privacy, persistence, or route-parameter contract changes are permitted in this issue.

## Execution slices

1. Compare every route module with the explicit scope of merged #55 children.
2. Record assignment and create one narrowly bounded issue per unassigned surface: #75, #76, and #77.
3. Update #55 with the inventory, links, and parent status.
4. Persist execution/review evidence; commit the documentation-only artifact and open a PR referencing #73.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: #73’s explicit acceptance criteria, route-module enumeration, and merged child-plan comparison.
- Remaining gaps: conduct fresh review of the documentation diff, then commit and open a PR referencing #73.
- Next action: review the route assignments and issue wording against the repository before the commit boundary.
