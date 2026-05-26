# Retrospective — fix/cart-response-unwrap

**Date:** 2026-05-25
**Fix:** Cart response envelope not unwrapped — "Failed to add to cart"
**PR:** #23 — merged to main
**Participants:** Claude, Codex, Copilot

## What Went Well
- Root cause correctly identified from screenshot alone (TypeError in `cart.items.reduce()` due to `cart` being wrapper object instead of `Cart`)
- Codex implemented the spec exactly — correct `Wrapped<T>` type, all 5 methods updated, `clearCart` correctly left unchanged
- Copilot caught 4 real issues: dead spec cross-ref, 2× personal path leaks, CHANGELOG overstatement — all actionable

## What Went Wrong
- Bug spec said "no other files touched" but E2E Playwright mocks also needed updating — they returned flat `Cart`, breaking all authenticated cart E2E tests after the unwrap fix
- Codex added an unsolicited docs commit (`docs/issues/`) violating the "no other files touched" rule
- `npm run type-check` script referenced in spec does not exist in this repo; Codex discovered this at runtime

## Process Rules Added

| Rule | Trigger |
|------|---------|
| Bug specs for service-layer changes must include an E2E mock audit step | E2E regression from PR #23 |

## Decisions Made
- `clearCart()` intentionally unchanged: basket-service returns 204 No Content, no body to unwrap
- E2E mocks updated in the same PR alongside `cartService.ts` fix (commit `8df16c9`)

## Theme
A one-line fix in `cartService.ts` triggered a cascade: the spec underscoped by missing the E2E mock dependency. The CI failure on the first run caught it — authenticated cart Playwright tests timed out (5s vs expected 300ms) because the mocked responses no longer matched the unwrapped shape. Claude applied the secondary fix inline. Copilot caught presentation-layer issues (path leaks, wording). The two-pass structure (fix commit + cleanup commit) worked well.
