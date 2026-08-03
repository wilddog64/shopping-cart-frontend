# Copilot PR #66 review findings

**Date:** 2026-08-02
**PR:** #66 — `build(frontend): wire VITE_STRIPE_PUBLISHABLE_KEY into image build`
**Reviewer:** copilot-pull-request-reviewer[bot]

PR #66 adds the `VITE_STRIPE_PUBLISHABLE_KEY` build ARG to the `Dockerfile` and both CI `build-args:`
blocks (the live-enablement step for the frontend). Copilot raised 2 comments — **both against the
pre-merge state**, when Phase E (the Stripe Elements consumer) had not yet reached `main`. Both are
**resolved by state**: Phase E is now merged to `main` (`e74ab38`) and merged into `feat/stripe-live`,
so `src/config/stripe.ts` and the Elements checkout now exist on the branch.

---

## Findings 1–2 — resolved by the Phase A–F merge (no code/doc change needed)

| # | Comment | File:line | Why it no longer applies |
|---|---------|-----------|--------------------------|
| 1 | "plan references `src/config/stripe.ts` but there's no Stripe code in `src/`" | `docs/plans/enable-stripe-live.md:10` | `src/config/stripe.ts` now exists (loads Stripe.js from `VITE_STRIPE_PUBLISHABLE_KEY`, exports `stripePromise`); the doc snippet matches. |
| 2 | "changelog says Elements is enabled but there's no Stripe integration code in `src/`" | `CHANGELOG.md:10` | The build-arg entry now sits alongside the Phase E `Added` entry documenting `src/config/stripe.ts` + the Elements card form. Once the image is rebuilt with the key, Elements is live in the published frontend. |

**Root cause:** the enablement PR was opened before the implementation PRs (A–F) merged, so Copilot
correctly flagged that the docs described code not yet on `main`. The chosen fix was ordering —
**merge A–F first, then enablement** — which this resolves rather than a doc rewrite.

**Note:** the publishable key stays a GitHub Actions **repository variable** (`vars.`), never a secret —
`pk_test_…` is client-visible by design; the secret `sk_…` lives only in the payment service via Vault/ESO.

---

## Test plan status

- [x] `feat/stripe-live` conflict-free with `main` after merge (`0d7e12d`)
- [x] `Dockerfile` ARG + both `ci.yml` build-args blocks intact
- [x] Copilot threads replied + resolved (resolved-by-state)
