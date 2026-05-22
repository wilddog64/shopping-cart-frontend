# Node.js 20 Deprecation in CI Workflows

**Date:** 2026-05-22
**Severity:** Warning (CI will continue to work but will degrade)
**Affects:** All shopping-cart repos with GitHub Actions CI

## Problem

GitHub Actions has deprecated Node.js 20 as the runner runtime. All jobs using
`actions/checkout@v4` and `actions/setup-node@v4` produce annotation warnings:

> Node.js 20 actions are deprecated. The following actions are running on Node.js 20
> and may not work as expected: actions/checkout@v4, actions/setup-node@v4

## Required Changes (per repo)

In `.github/workflows/ci.yml`, for every job:

| Before | After |
|--------|-------|
| `uses: actions/checkout@v4` | `uses: actions/checkout@v4` (no change needed — v4 supports Node 22) |
| `uses: actions/setup-node@v4` | `uses: actions/setup-node@v4` (no change needed) |
| `node-version: '20'` | `node-version: '22'` |

The warning is about the **app's Node.js version** (`node-version: '20'`), not the action
versions. Node.js 22 is the current LTS (since April 2025).

## Affected Repos

- `shopping-cart-frontend` — `ci.yml` has 5 jobs each with `node-version: '20'`
- `shopping-cart-basket` — likely same pattern
- `shopping-cart-order` — likely same pattern
- `shopping-cart-payment` — likely same pattern
- `shopping-cart-product-catalog` — likely same pattern

## Fix

Update `node-version: '20'` → `node-version: '22'` in all `setup-node` steps.
Since `node-version` is now centralized as a workflow-level env var in `shopping-cart-frontend`
(added in PR #17), the fix there is a single-line change:

```yaml
# Before
env:
  VITE_KEYCLOAK_URL: https://keycloak.3ai-talk.org
  VITE_KEYCLOAK_REALM: shopping-cart
  VITE_CLIENT_ID: frontend

# After — add node version here too
env:
  NODE_VERSION: '22'
  VITE_KEYCLOAK_URL: https://keycloak.3ai-talk.org
  VITE_KEYCLOAK_REALM: shopping-cart
  VITE_CLIENT_ID: frontend
```

Then reference `${{ env.NODE_VERSION }}` in every `setup-node` step.

## Planned For

Next PR on `docs/next-improvements` branch across all shopping-cart repos.
