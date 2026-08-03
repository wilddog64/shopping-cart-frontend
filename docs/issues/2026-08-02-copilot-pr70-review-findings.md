# Copilot PR #70 review findings

**Date:** 2026-08-02
**PR:** #70 — `ci(frontend): reuse PACKAGES_TOKEN for deploy PR flow (drop CI_DEPLOY_PAT)`
**Reviewer:** copilot-pull-request-reviewer[bot]

PR #70 swaps the deploy step's `GH_TOKEN` from the never-created `CI_DEPLOY_PAT` to the existing
shared `PACKAGES_TOKEN`. Copilot raised 1 comment — valid, fixed on this branch.

---

## Finding 1 — CHANGELOG `[Unreleased] > Fixed` still names `CI_DEPLOY_PAT`

| | |
|---|---|
| **File:line** | `CHANGELOG.md:19` |
| **Flag** | The `Fixed` entry (added by #69) still says the deploy PR flow uses `CI_DEPLOY_PAT` and that the `CI_DEPLOY_PAT` secret is required — this PR changes the workflow to `PACKAGES_TOKEN`, so the entry contradicts the change. |

**Fix:** Both entries lived under the same unreleased section, so I folded them into one accurate
narrative rather than describing an intermediate token that never shipped:
- Updated the `Fixed` entry to reference `PACKAGES_TOKEN` and drop the "Requires the `CI_DEPLOY_PAT`
  repo secret" clause.
- Removed the separate `Changed` entry I had added (it only made sense as a diff against the
  `CI_DEPLOY_PAT` wording; redundant once the Fixed entry is corrected).

**Root cause:** the follow-up PR added a new `Changed` entry to describe the swap instead of editing
the original `Fixed` entry. Because `CI_DEPLOY_PAT` never shipped (both entries are still under
`[Unreleased]`), the released changelog should describe only the final `PACKAGES_TOKEN` state — a
correction to the existing entry, not a new "we changed our mind" entry.

**Process note:** when a follow-up PR amends an unreleased change, edit the existing `[Unreleased]`
entry in place rather than appending a second entry that narrates the intermediate state.

---

## Test plan status

- [x] CI green (Lint, Type Check, Test, Build, E2E, Security Scan, GitGuardian all pass)
- [x] `actionlint .github/workflows/ci.yml` clean
- [x] Fix committed + pushed
- [x] Copilot thread replied + resolved
