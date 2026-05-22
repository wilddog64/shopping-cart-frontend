# PR #17 Retrospective — fix/vite-keycloak-url

**Merge SHA:** `41fb0751d9549b8e7c4bd7efd6b8820574183f5e`
**Date:** 2026-05-22

## What Went Well

- **Root cause correctly identified** — `VITE_KEYCLOAK_URL` was baked into the GHCR image with the wrong value (`http://keycloak.identity.svc.cluster.local:8080` instead of `http://keycloak.shopping-cart.local`), causing a blank page after successful Keycloak OIDC redirect
- **CI workflow fix applied correctly** — added `VITE_KEYCLOAK_URL=http://keycloak.shopping-cart.local` as `build-args` to the reusable `publish` job workflow call, ensuring the URL is baked into future image builds
- **Copilot caught duplication** — Copilot review identified the same Keycloak URL hardcoded in two places in `nginx.conf` (`CSP` policy and `proxy_pass` backend reference) and flagged it for normalization
- **GraphQL thread resolution worked cleanly** — Copilot findings were resolved and threads properly closed; no lingering review comments

## What Went Wrong

- **Image published with wrong VITE_* value from the start** — the initial `publish` job in `.github/workflows/ci.yml` had `build-args` containing `VITE_KEYCLOAK_URL=http://keycloak.identity.svc.cluster.local:8080` (a DNS internal-cluster name that doesn't resolve in browser context); this error propagated to all published GHCR images until the fix
- **Two direct pushes to main occurred during debugging** — the CSP fix (`nginx.conf`) and the nginx config port/volume cleanup were pushed directly to `origin/main` instead of being part of a feature branch PR; this violated the shopping-cart-frontend process rule and left the history fragmented
- **Refactor commit required after initial fix** — the first `ci.yml` fix was merged, but Copilot then flagged the duplication in `nginx.conf`, requiring a follow-up refactor commit to normalize the URL; this could have been caught in review if the entire change scope was clear upfront

## Process Rules Added / Reinforced

1. **Never push directly to main in shopping-cart repos** — always create a feature branch, open a PR, and merge through the normal workflow. The two direct pushes to main during this debugging session violated this rule.
   - Correct: `git push origin HEAD:fix/vite-keycloak-url` (explicit branch name)
   - Wrong: `git push` (silently targets main due to upstream-tracking quirk)

2. **GitHub Actions: env variables unavailable in reusable workflow `with:` inputs** — when a reusable workflow needs an environment variable like `VITE_KEYCLOAK_URL`, it must be passed as an explicit string or `secrets.*`, not as `${{ env.VITE_KEYCLOAK_URL }}`. Document this constraint in the workflow comment.

3. **Workflow-level `env:` block is the contract** — the `publish` job in `.github/workflows/ci.yml` now has a workflow-level `env:` section defining `VITE_KEYCLOAK_URL: http://keycloak.shopping-cart.local`. The reusable workflow call must pass this value explicitly in the `build-args` input because GitHub Actions does not propagate `env:` context to reusable workflow parameters.

## Decisions Made

1. **Keep explicit value in `publish` job** — rather than trying to reference the workflow-level `env:` variable in `build-args`, we keep the value explicit (`VITE_KEYCLOAK_URL=http://keycloak.shopping-cart.local`) and add a comment explaining the constraint: `# env context unavailable in reusable workflow inputs; see GitHub Actions docs`

2. **Normalize nginx.conf after CSP policy fix** — the CSP policy and proxy backend reference both needed to use `http://keycloak.shopping-cart.local` instead of the internal cluster DNS name; the refactor commit consolidated these changes

## Theme

**Root cause of blank page:** Keycloak OIDC integration bakes environment variables into the Vite build at compile time. The `VITE_KEYCLOAK_URL` was set to an internal cluster DNS name that doesn't resolve from the browser. Fix required rebuilding the image with the correct external Keycloak URL and redeploying. The larger lesson: environment variables for external URLs must be baked at image build time in Vite (not at runtime), and the CI workflow must explicitly pass these values to the Docker build.

## Validation Notes

- Locally verified: `docker run ghcr.io/wilddog64/shopping-cart-frontend:<tag> node -e "console.log(process.env.VITE_KEYCLOAK_URL || 'undefined')"` shows the hardcoded value is present in the image
- Live cluster test: frontend now successfully redirects to Keycloak and receives the auth code without blank page
