# Retrospective — PR #18 E2E Mock Format Fixes

**Date:** 2026-05-22
**PR:** #18 — merged to main (`128659675aadd88aac7d7561e064b4c1ae670e7c`)
**Participants:** Claude, Codex, Copilot

## What Went Well
- Root cause identified quickly: OIDC auth fix revealed pre-existing mock format bugs
- Exact before/after spec provided — Codex implemented without interpretation errors
- CI green on first push after fix

## What Went Wrong
- Mock format mismatches were pre-existing but masked by broken OIDC auth
- `orders.spec.ts` returned paginated wrapper `{ data: [...] }` — service expects plain array
- `products.spec.ts` used camelCase field names (`stock`, `createdAt`) — service expects snake_case (`quantity`, `created_at`)

## Decisions Made
- Mock response format must exactly match what the service layer parses, not what the UI renders
- `node --check` is the only viable syntax gate in CI (no local app server for Playwright)

## Theme
The OIDC auth fix in `1ee323f` was correct but acted as a key that unlocked latent test failures. Once auth worked, pages actually called their APIs, and the mismatched mocks caused timeouts. Two fixes in one PR: the auth mock key name (already merged), and now the response format alignment.
