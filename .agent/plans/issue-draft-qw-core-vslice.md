# Issue Draft — QuickWerk: Shift from Demo UI Polish to Real MVP Vertical Slice

## Title
QuickWerk MVP pivot: implement real auth + provider eligibility + booking create/accept thin slice (persisted), stop demo-only increments

## Problem
Current repo has strong demo/UI polish and deterministic preview metadata but lacks core production mechanics (real auth/session, persistence, booking lifecycle enforcement, async jobs, security baselines). This creates delivery illusion risk and blocks meaningful client value.

## Goal
Deliver a real thin vertical slice:
1. Authenticated customer can create booking request
2. Eligible provider can accept request
3. State transitions are server-validated + persisted + auditable
4. Product app consumes real APIs for this slice

## Acceptance Criteria
- [ ] `/api/v1/auth/session` is backed by real session resolution (no hardcoded anonymous fixture)
- [ ] Minimal persistence layer exists (users/providers/bookings/status history)
- [ ] Booking create + accept endpoints enforce valid transitions
- [ ] Product app uses real API for at least one marketplace slice
- [ ] Automated checks pass (`pnpm check`, focused tests)
- [ ] Handoff docs updated to reflect real-state progress

## Labels (suggested)
- enhancement
- backend
- frontend
- architecture
- mvp

## Priority
P0 (delivery-critical)
