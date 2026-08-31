# Plan — #77 Booking messenger responsiveness and parity

## Issue and scope

- **Issue:** [#77](https://github.com/MarkoAtc/QuickWerk/issues/77)
- **Parent:** Refs #55 and #73
- **Branch:** `codex/fix/77-messenger-responsive`
- **Scope:** Make the existing local messenger route phone-safe and closer to the approved messenger composition. Only the route's presentation and a focused responsive policy may change.

## Acceptance criteria

- [ ] At 320, 360, 390, 430, and 1024px, messenger content has no page-level horizontal overflow, clipped composer, unreadable wrapping, or inaccessible send control.
- [ ] Empty composer, long thread, long message, keyboard, sending, and route-back states remain usable.
- [ ] Booking parameter handling, local thread/message behavior, navigation, and all backend/API/auth/privacy/retention boundaries are unchanged.
- [ ] Focused RED/GREEN policy tests, product tests, type-check, Expo web export, and browser QA are recorded.

## Risk / TDD classification

`risky-logic` — introduce a pure layout policy and its failing tests first. The route must retain the exact existing append-on-send behavior and request-free data boundary.

## Validation Contract

### Assertions

- [ ] Phone widths resolve to 16px gutters, bounded 32px hero text, 16px card padding, 88%-or-smaller bubbles, and a 44px-or-greater send control.
- [ ] Compact and 1024px layouts retain intentional wider values; invalid widths fail closed to phone-safe values.
- [ ] The composer stays above safe-area/keyboard pressure, text wraps in message and booking-context cards, and the ScrollView remains usable while keyboard is open.
- [ ] Empty sends do nothing; a non-empty trimmed message is appended with the existing outbound direction/meta behavior and clears the input.
- [ ] Route parameters (`bookingId`, counterpart values, headline) and active-job handoff are unchanged.

### Performance bounds

`N/A —` policy selection is constant-time and presentation changes add no requests, timers, storage, or listeners.

### Interface contracts

`N/A —` no backend, API-client, domain, auth, authorization, payment, privacy, persistence, or route-parameter contract changes are permitted.

## Implementation slices

1. Add a pure messenger layout policy and RED/GREEN coverage for phone, compact, wide, and invalid widths.
2. Apply the existing shared responsive classification and safe-area-aware composer layout to `MessengerScreen`.
3. Keep route state/actions unchanged; verify the focused behavior and browser viewport matrix.

## Browser QA

At 320x640, 360x800, 390x844, 430x932, and 1024x900, cover a long booking identifier/counterpart label, long inbound/outbound messages, empty composer, sending a message, and keyboard-open composer. Confirm no page overflow, clipped send control, or inaccessible scroll content.

## Gate Result

- Gate: Plan
- Status: PASS
- Evidence: #77 acceptance criteria, existing route/screen inspection, active-job handoff inspection, and the approved `design/messenger` reference.
- Remaining gaps: RED/GREEN implementation and environment-ready product/browser validation.
- Next action: add the pure policy test before consuming it in the screen.
