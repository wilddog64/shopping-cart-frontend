# Fix frontend deploy job — replace blocked `git push origin HEAD:main` with a PR-based flow

**Repo:** `shopping-cart-frontend`
**Branch (create from origin/main):** `fix/frontend-deploy-pipeline`
**File:** `.github/workflows/ci.yml`

---

## Problem

The `Build, Scan, Push & Deploy` job builds and pushes the image successfully, then its last
step ("Update Kubernetes manifest to the new image tag") does `git push origin HEAD:main` to
bump `k8s/base/kustomization.yaml` `newTag`. Branch protection on `main` rejects that push:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
- Changes must be made through a pull request.
- 6 of 6 required status checks are expected.
```

**Root cause:** the deploy step commits directly to a protected branch. It fails on every main
push, so `newTag` never advances past `latest`. Because git stays at `newTag: latest`, ArgoCD
pinned the digest at first sync and never re-pulls — hostinger runs a stale image
(`sha-b6e76db…`) even though newer images (with `VITE_STRIPE_PUBLISHABLE_KEY` baked in, post-#66)
are published to ghcr.

**Chosen fix (user decision 2026-08-02):** durable pipeline fix — the deploy step opens an
**auto-merged PR** instead of pushing to `main`, and pins a real `sha-<commit>` (not `latest`).
This preserves branch protection (the PR still runs and must pass all 6 required checks — this is
NOT a protection bypass) and is self-sustaining. A loop guard prevents the deploy-PR merge from
re-triggering another deploy.

---

## Owner prerequisite (outside this change)

Create a **fine-grained PAT** scoped to `shopping-cart-frontend` with **Contents: Read and write**
and **Pull requests: Read and write** ONLY (no admin, no "bypass branch protections"), and add it
as an **Actions secret** named `CI_DEPLOY_PAT`. The PAT is required so the PR created by the deploy
job triggers the `pull_request` CI (a PR opened with the default `GITHUB_TOKEN` does NOT trigger
workflows, so its required checks would never run and auto-merge would hang). The PAT does **not**
bypass any check — the PR still must pass all 6 required checks to merge. `allow_auto_merge` is
already enabled and `required_approving_review_count` is 0 on this repo, so no human review is needed.

---

## Fix

### Change 1 — `.github/workflows/ci.yml`: loop guard on the deploy job `if:`

**Exact old block:**

```yaml
    name: Build, Scan, Push & Deploy
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

**Exact new block:**

```yaml
    name: Build, Scan, Push & Deploy
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push' && !startsWith(github.event.head_commit.message, 'ci(deploy):')
```

### Change 2 — `.github/workflows/ci.yml`: add `pull-requests: write` permission

**Exact old block:**

```yaml
    permissions:
      contents: write
      packages: write
```

**Exact new block:**

```yaml
    permissions:
      contents: write
      packages: write
      pull-requests: write
```

### Change 3 — `.github/workflows/ci.yml`: replace the direct-push step with a PR flow

**Exact old block:**

```yaml
      - name: Update Kubernetes manifest to the new image tag
        run: |
          target_tag="newTag: sha-${{ github.sha }}"
          if ! grep -qF "$target_tag" k8s/base/kustomization.yaml; then
            sed -i "s|^    newTag:.*|    $target_tag|" k8s/base/kustomization.yaml
          fi

          if ! grep -qF "$target_tag" k8s/base/kustomization.yaml; then
            echo "::error::k8s/base/kustomization.yaml was not updated to $target_tag"
            exit 1
          fi

          if git diff --quiet -- k8s/base/kustomization.yaml; then
            echo "Manifest already matches $target_tag; no commit needed"
            exit 0
          fi

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/base/kustomization.yaml
          git commit -m "ci: update frontend image to sha-${{ github.sha }}"
          git push origin HEAD:main
```

**Exact new block:**

```yaml
      - name: Open PR to update Kubernetes manifest to the new image tag
        env:
          GH_TOKEN: ${{ secrets.CI_DEPLOY_PAT }}
        run: |
          target_tag="newTag: sha-${{ github.sha }}"
          if ! grep -qF "$target_tag" k8s/base/kustomization.yaml; then
            sed -i "s|^    newTag:.*|    $target_tag|" k8s/base/kustomization.yaml
          fi

          if ! grep -qF "$target_tag" k8s/base/kustomization.yaml; then
            echo "::error::k8s/base/kustomization.yaml was not updated to $target_tag"
            exit 1
          fi

          if git diff --quiet -- k8s/base/kustomization.yaml; then
            echo "Manifest already matches $target_tag; nothing to deploy"
            exit 0
          fi

          branch="ci/frontend-image-sha-${{ github.sha }}"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git checkout -b "$branch"
          git add k8s/base/kustomization.yaml
          git commit -m "ci(deploy): frontend image sha-${{ github.sha }}"
          git push origin "$branch"

          gh pr create --base main --head "$branch" \
            --title "ci(deploy): frontend image sha-${{ github.sha }}" \
            --body "Automated image bump from CI. Auto-merges once required checks pass."
          gh pr merge "$branch" --auto --squash --delete-branch
```

---

## Why this is loop-safe

- The deploy PR's squash-merge commit message is `ci(deploy): frontend image sha-…`.
- That merge is a `push` to `main`, which would normally re-run the deploy job — but Change 1's
  `!startsWith(github.event.head_commit.message, 'ci(deploy):')` guard skips it.
- So: normal merge → build+push image → deploy PR opened+auto-merged → merge commit `ci(deploy):`
  → deploy job skipped → no new PR. No infinite loop. (The `build` job may still run on the
  `ci(deploy):` commit; that is harmless — it produces no new deploy PR.)

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | loop guard on deploy `if:`; add `pull-requests: write`; replace direct push with branch+PR+auto-merge using `CI_DEPLOY_PAT` |

## Rules

- `actionlint .github/workflows/ci.yml` — zero errors.
- No other file touched. No `pk_`/`sk_`/token literal anywhere.
- Do NOT change the `build-args` (the `VITE_STRIPE_PUBLISHABLE_KEY` wiring stays).

## Definition of Done

- [ ] `actionlint` clean on `ci.yml`
- [ ] The three exact blocks applied verbatim; no other diff
- [ ] Committed + pushed to `fix/frontend-deploy-pipeline`
- [ ] memory-bank updated with commit SHA and task status

**Commit message (exact):**
```
ci(frontend): deploy image via auto-merged PR instead of pushing to protected main
```

## What NOT to Do

- Do NOT create a PR for THIS change (Claude handles PR creation after verifying).
- Do NOT skip pre-commit hooks (`--no-verify`).
- Do NOT modify any file other than `.github/workflows/ci.yml`.
- Do NOT add a branch-protection-bypass token — the PAT is PR-scoped only; checks still gate.
- Do NOT commit to `main` — work on `fix/frontend-deploy-pipeline`.

---

## Note — separate immediate deploy (NOT part of this spec)

This fix makes *future* deploys work but does not itself deploy the current pk_test image. Once
this lands (or independently), the stale hostinger frontend can be advanced by pinning
`k8s/base/kustomization.yaml` `newTag: sha-<latest-good>` via a normal PR. Tracked in
`docs/issues/` — do not fold into this workflow change.
