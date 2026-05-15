# Frontend main push was accidental and reverted

## What was attempted

I created `shopping-cart-frontend-v0.5.1` from `origin/main`, updated:

- `.github/workflows/ci.yml`
- `nginx.conf`

I then pushed the branch and discovered that the first push updated `origin/main` instead of only creating the feature branch.

## Actual output

```text
To github.com:wilddog64/shopping-cart-frontend.git
   b59b943..6120783  shopping-cart-frontend-v0.5.1 -> main
```

```text
Switched to branch 'main'
Your branch is behind 'origin/main' by 2 commits, and can be fast-forwarded.
(use "git pull" to update your local branch)
Updating 74d994f..6120783
Fast-forward
 .github/workflows/ci.yml | 3 ++-
 nginx.conf               | 2 +-
 2 files changed, 3 insertions(+), 2 deletions(-)
[main 2872a4c] Revert "fix(frontend): wire Keycloak SSO build args and CSP host"
 Date: Fri May 15 09:19:12 2026 -0700
 2 files changed, 2 insertions(+), 3 deletions(-)
```

```text
To github.com:wilddog64/shopping-cart-frontend.git
   6120783..2872a4c  main -> main
```

## Root cause

The local branch was created to track `origin/main`, and the first `git push` used the upstream/default remote ref instead of creating the new branch ref explicitly.

## Follow-up

- Keep using explicit refspec pushes for this repo when creating new feature branches.
- Verify the remote branch ref before pushing unrelated branch work.
- Confirm `origin/main` stays at the revert commit `2872a4c` unless a PR intentionally changes it.
