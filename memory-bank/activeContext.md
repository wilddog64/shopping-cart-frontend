# Active Context: Frontend (React/TypeScript)

## Latest completed task

- **Guest cart merge fixed `27acd07` (2026-08-04).** Frontend now retains the basket `X-Cart-Token`, sends it on cart requests, and merges the guest cart into the authenticated account on first cart load. Regression was documented in `docs/issues/2026-08-04-guest-cart-not-merged-after-login.md`; TypeScript, lint, and Vitest (26/26) passed.

- **Frontend deploy PR flow COMPLETE** — `077c154` on `fix/frontend-deploy-pipeline` replaces protected-main direct pushes with an auto-merged deploy PR, adds the loop guard and pull-request permission; `actionlint` passed and the branch is pushed.

- **Stripe Elements checkout COMPLETE `88ab4c8` on `origin/feat/stripe-checkout-elements` (2026-08-01).** Added test-mode Stripe tokenization and order-orchestrator checkout; TypeScript, lint, production build, and Vitest gates passed (26/26).

## Current Status (2026-03-14)

CI green. All PRs merged to main. Branch protection active.

## What's Implemented

- React 18 + TypeScript + Vite SPA
- Pages: Home, Products, ProductDetail, Cart, Orders, Login, LoginCallback
- Keycloak OIDC integration (react-keycloak-web)
- Zustand cart store, React Query for data fetching
- Vitest + React Testing Library unit tests
- GitHub Actions CI: ESLint + TypeScript check + Vitest + Trivy + ghcr.io push

## CI History

- **fix/ci-stabilization PR #1** — merged 2026-03-14. Fixed: react-refresh lint warnings (targeted eslint-disable), vite/client types, tsconfig paths.
- **Branch protection** — 1 review + CI required, enforce_admins: false

## Active Task

- **Stripe publishable-key image wiring** — `feat/stripe-live` commit `d1b3726` adds the Vite Stripe build ARG and repository-variable build args to both CI image builds; pushed to origin. Existing untracked planning docs were preserved.

- **Multi-arch workflow pin** — branch `fix/multiarch-workflow-pin` updates `.github/workflows/ci.yml` to reference infra SHA `999f8d7` (linux/amd64 + linux/arm64 images).
- **v0.1.0 release** — cut `release/v0.1.0` from main, add CHANGELOG, open PR, tag after merge.

## Agent Instructions

Rules that apply to ALL agents working in this repo:

1. **CI only** — do NOT run `npm run lint` or `npm test` locally without `npm install` first.
2. **Memory-bank discipline** — do NOT update until CI shows `completed success`.
3. **SHA verification** — verify commit SHA before reporting.
4. **Do NOT merge PRs** — open the PR and stop.

## Key Notes

- Node 20 required (`engines` field in package.json)
- `VITE_KEYCLOAK_URL` env var required for auth to work in local dev
