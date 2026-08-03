# Copilot PR #69 review findings

**Date:** 2026-08-02
**PR:** #69 — `fix(ci): deploy frontend image via auto-merged PR (GH006 fix)`
**Reviewer:** copilot-pull-request-reviewer[bot]
**Fix commit:** `6270b6e`

PR #69 changes the `publish` job's deploy step to open an auto-merged PR instead of pushing the
manifest bump directly to protected `main` (GH006). Copilot raised 2 comments — both valid, both
fixed in `6270b6e`.

---

## Finding 1 — `gh pr merge` should target the PR URL, not the branch name

| | |
|---|---|
| **File:line** | `.github/workflows/ci.yml:261` |
| **Flag** | `gh pr merge "$branch"` — elsewhere in this repo (Dependabot auto-merge) merges use the PR URL; using the URL avoids ambiguity and is less sensitive to `gh` CLI argument parsing. |

**Before:**
```yaml
          gh pr create --base main --head "$branch" \
            --title "ci(deploy): frontend image sha-${{ github.sha }}" \
            --body "Automated image bump from CI. Auto-merges once required checks pass."
          gh pr merge "$branch" --auto --squash --delete-branch
```

**After:**
```yaml
          pr_url=$(gh pr create --base main --head "$branch" \
            --title "ci(deploy): frontend image sha-${{ github.sha }}" \
            --body "Automated image bump from CI. Auto-merges once required checks pass.")
          gh pr merge "$pr_url" --auto --squash --delete-branch
```

**Root cause:** `gh pr merge` accepts a branch name, but if multiple PRs share a head branch (or the
branch is ambiguous) the resolution is not deterministic. Capturing the URL that `gh pr create` emits
ties the merge to the exact PR just created.

---

## Finding 2 — spec Rules wording contradicts the memory-bank update requirement

| | |
|---|---|
| **File:line** | `docs/plans/frontend-deploy-gh006-pr-flow.md:172` (also :190) |
| **Flag** | "No other file touched" in `## Rules` contradicts the DoD line "memory-bank updated with commit SHA". |

**Fix:** clarified both lines to say only functional/source files are limited to `ci.yml`;
documentation and `memory-bank/` updates are the expected exception.

**Root cause:** the `/bugfix` spec template's boilerplate "Do NOT modify any file other than the
listed targets" was copied verbatim without carving out the memory-bank update that the same
template's Definition of Done requires.

**Process note:** the spec template should state the scope rule as "no functional file other than
the listed targets — documentation and `memory-bank/` updates are always allowed" so the two
sections stop contradicting each other.

---

## Test plan status

- [x] `actionlint .github/workflows/ci.yml` clean after the merge-by-URL change
- [x] Fix committed + pushed (`6270b6e`)
- [x] Copilot threads replied + resolved
