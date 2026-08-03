# Reuse `PACKAGES_TOKEN` for the frontend deploy PR flow (drop `CI_DEPLOY_PAT`)

**Repo:** `shopping-cart-frontend`
**Branch (from origin/main):** `fix/frontend-deploy-reuse-packages-token`
**File:** `.github/workflows/ci.yml`
**Supersedes (PAT choice only):** `docs/plans/frontend-deploy-gh006-pr-flow.md`

---

## Problem

PR #69 shipped the GH006 fix — the deploy step opens an auto-merged manifest-bump PR instead of
pushing directly to protected `main`. It referenced a **new** secret `CI_DEPLOY_PAT` that did not
yet exist, so the deploy step is inert until that secret is created.

**Decision (user, 2026-08-02):** do NOT create/track another PAT. Reuse the existing shared
`PACKAGES_TOKEN`, which is already present in all five shopping-cart repos (created 2026-05-03) and
is already used by the backend repos to perform manifest-bump **git pushes** via the shared
`build-push-deploy.yml` reusable workflow. That proves it carries `repo`-scope (Contents write +
Pull requests write) — exactly what the frontend deploy step needs to push a branch and open/merge
a PR. `PACKAGES_TOKEN` already exists in `shopping-cart-frontend`, so nothing new is created.

**Trade-off (accepted):** `PACKAGES_TOKEN` is a broader, shared classic PAT rather than the
narrow single-repo fine-grained token the original spec described. Reusing it matches the existing
convention across every backend repo and avoids PAT sprawl. The token still does **not** bypass
branch protection — the deploy PR must pass all required checks; `required_approving_review_count`
is 0 so auto-merge lands it once green.

---

## Fix

### Change 1 — `.github/workflows/ci.yml`: deploy step token

**Exact old block:**

```yaml
          GH_TOKEN: ${{ secrets.CI_DEPLOY_PAT }}
```

**Exact new block:**

```yaml
          GH_TOKEN: ${{ secrets.PACKAGES_TOKEN }}
```

---

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | deploy step `GH_TOKEN` → `secrets.PACKAGES_TOKEN` (reuse existing shared token) |
| `docs/plans/frontend-deploy-gh006-pr-flow.md` | Owner-prerequisite section amended to point at this decision |
| `CHANGELOG.md` | `[Unreleased]` entry |
| `memory-bank/progress.md` | note updated to reflect `PACKAGES_TOKEN` reuse |

## Rules

- `actionlint .github/workflows/ci.yml` — zero errors.
- No functional/source file other than `.github/workflows/ci.yml` is touched (documentation and
  `memory-bank/` updates are expected and allowed). No `pk_`/`sk_`/token literal anywhere.

## Definition of Done

- [ ] `actionlint` clean on `ci.yml`
- [ ] deploy step references `secrets.PACKAGES_TOKEN`
- [ ] Committed + pushed to `fix/frontend-deploy-reuse-packages-token`
- [ ] PR opened; CI green; Copilot findings addressed
- [ ] memory-bank updated
