# Retrospective — OIDC Fix + Node.js 20→22 Upgrade

**Date:** 2026-05-22
**PR:** #19 — merged to main (`1ce1dfccd895fe3b79155e0d5b60334ae54d3d12`)
**Participants:** Claude, Codex, Copilot

## What Went Well

- Codex committed cleanly with correct commit message
- Copilot caught the missing `NODE_VERSION` env var centralization (workflow drift risk) — identified that 6 setup-node steps were individually pinned to Node 20, creating maintenance debt
- Copilot caught the Empty Orders mock returning paginated wrapper instead of plain array (real bug that would mask empty-state regressions)
- npm audit fix resolved 12 of 23 advisories without `--force`
- OIDC localStorage key resolution fixed to match `VITE_KEYCLOAK_URL` env var instead of hardcoded `http://localhost:8080` — unblocked authenticated E2E tests in CI

## What Went Wrong

- Empty Orders E2E mock was returning a paginated wrapper object `{items: [], total: 0, pages: 1}` instead of a plain array `[]` — orderService.getOrders() would have silently failed on empty state by attempting to access `.items` on an undefined result
- Security scan appeared as "exit code 1" in CI but is non-blocking (`continue-on-error: true` prevents build failure)
- 11 npm audit vulnerabilities remain (esbuild + minimatch transitive dev-only deps); `--force` deferred due to risk of breaking changes

## Decisions Made

- **NODE_VERSION centralization:** workflow-level env var established; all 6 job steps now reference `${{ env.NODE_VERSION }}` — eliminates per-job drift and single point of update
- **npm audit --force deferred:** remaining 11 vulns are dev-only transitive deps (esbuild dev server, minimatch ReDoS); `--force` risks breaking changes in downstream consumers
- **continue-on-error: true on security scan:** audit failures must never block CI — scanning happens, results are logged, but build succeeds; security team reviews separately

## Theme

Upgraded Node.js from 20 to 22 in the frontend CI workflow and centralized the version via a workflow-level `NODE_VERSION` env var to prevent per-job drift. Copilot caught a real bug in the E2E test mocks: the Empty Orders test was returning a paginated API wrapper instead of a plain array, which would have masked a regression in empty-state handling. Fixed alongside the Node.js upgrade, OIDC localStorage key resolution to match environment URL, and a partial npm audit fix (12 of 23 advisories resolved without --force).
