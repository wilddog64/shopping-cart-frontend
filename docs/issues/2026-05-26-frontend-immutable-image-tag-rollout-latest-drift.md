# Frontend image rollout stays on `latest` unless CI rewrites the manifest

**Repository:** `shopping-cart-frontend`  
**Date:** 2026-05-26  
**Status:** Open

## Problem
The frontend deployment still references `shopping-cart/frontend:latest` through `k8s/base/kustomization.yaml`.

That is fine for ad hoc local testing, but it is not a reliable deployment contract for the remote cluster:
- a new image can be published without changing the manifest
- the running pod can remain on an old image until it is manually restarted
- the visible result is stale nginx behavior even though the source branch has already been merged

We saw this with the MinIO product-image proxy fix:
- the code was merged
- the live frontend pod still served the old nginx config
- the browser kept returning broken image placeholders until the deployment was rolled

## Evidence
- `k8s/base/kustomization.yaml` still points at `newTag: latest`
- the current CI workflow already builds a SHA-tagged image during push on `main`
- the reusable publish workflow in `shopping-cart-infra` also tags `sha-${{ github.sha }}` and then tries to rewrite the manifest, but the repo itself does not guarantee that the manifest is updated as part of the frontend release flow

## Root Cause
The deployment uses a mutable tag (`latest`) instead of an immutable release tag tied to the merge commit.

That means the cluster only changes when:
- a human restarts the pod, or
- some out-of-band automation successfully rewrites the manifest after the merge

If that rewrite step is skipped, delayed, or fails silently, Argo CD continues to deploy the old tag and the live pod stays stale.

## Expected Behavior
Every merge to `main` should:
- publish a uniquely tagged frontend image (`sha-${GITHUB_SHA}`)
- update `k8s/base/kustomization.yaml` to that immutable tag
- fail the release workflow if the manifest update cannot be committed and pushed

## Proposed Fix
Move the frontend repo to an immutable image-tag rollout path:
1. Keep the local build tag for dev use, but stop relying on `latest` for cluster deployment.
2. Make the `main` push workflow publish `ghcr.io/wilddog64/shopping-cart-frontend:sha-${{ github.sha }}`.
3. Update `k8s/base/kustomization.yaml` to the same SHA tag in the same release flow.
4. Treat manifest-update failure as a workflow failure, not a best-effort step.

## Files in Scope
- `.github/workflows/ci.yml`
- `k8s/base/kustomization.yaml`

## Verification
After the fix, a merge to `main` should leave the repository manifest on a SHA tag and the next Argo CD sync should roll the frontend without manual restart.
