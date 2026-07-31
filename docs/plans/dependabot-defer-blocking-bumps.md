# Task: extend #64's Dependabot ignore rules to clear the CI-blocking + behind bumps

**Repo:** `shopping-cart-frontend`
**Work branch (EXISTING — the open PR #64 branch, do NOT branch off main):**
`chore/dependabot-ignore-breaking-majors`
**Spec branch (where THIS file lives — pull it, but do NOT commit to it):**
`docs/dependabot-defer-plan`
**File to change:** `.github/dependabot.yml`, `CHANGELOG.md`

This extends the already-open PR #64 ("defer breaking major bumps via ignore
rules"). All work goes on that PR's branch so the changes land in #64.

---

## Problem being solved

The frontend PR queue is stuck. Live triage found:

- **PR #65** (`npm-minor-patch` group) — CI **fails** at install with `ERESOLVE`:
  the group bumps `eslint-plugin-react-refresh` `0.4.5 → 0.5.3`, whose peer needs
  `eslint@^9||^10`, but the repo pins `eslint@^8.56.0` (eslint 9 is deliberately
  deferred). The one bad member fails the whole group.
- **PR #37** — `node` docker base image `22-alpine → 25-alpine`: a **major** bump to
  a **non-LTS** line. Stay on LTS 22.
- **PRs #35 #33 #32 #31** — GitHub Actions **major** bumps (codecov-action 5→7,
  build-push-action 5→7, setup-buildx-action 3→4, upload-artifact 4→7).

`main`'s `package.json` already pins `eslint-plugin-react-refresh` at `^0.4.5`
(eslint-8-compatible) — so **no `package.json` change is needed**. The fix is
purely to stop Dependabot from proposing these bumps, via `ignore` rules. Minor/
patch (including security) still flow, and the nginx minor bump (#34) is untouched.

---

## Before You Start

- In the `shopping-cart-frontend` repo:
  `git fetch origin` then `git checkout docs/dependabot-defer-plan && git pull origin docs/dependabot-defer-plan` to read this spec.
- Then switch to the **work** branch:
  `git checkout chore/dependabot-ignore-breaking-majors && git pull origin chore/dependabot-ignore-breaking-majors`.
- Confirm you are on `chore/dependabot-ignore-breaking-majors` and NOT on `main` or the spec branch before editing.

---

## Fix

### Change 1 — `.github/dependabot.yml`: defer `eslint-plugin-react-refresh` (unblocks #65)

**Exact old block:**

```yaml
      - dependency-name: "eslint"
        update-types: ["version-update:semver-major"]
  - package-ecosystem: "docker"
```

**Exact new block:**

```yaml
      - dependency-name: "eslint"
        update-types: ["version-update:semver-major"]
      - dependency-name: "eslint-plugin-react-refresh"
        update-types: ["version-update:semver-minor", "version-update:semver-major"]
  - package-ecosystem: "docker"
```

### Change 2 — `.github/dependabot.yml`: defer docker `node` major + all github-actions majors

**Exact old block:**

```yaml
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Exact new block:**

```yaml
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    ignore:
      # node major deferred — stay on the current LTS line (22). Minor/patch and
      # non-node images (nginx) still flow.
      - dependency-name: "node"
        update-types: ["version-update:semver-major"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    ignore:
      # Action major bumps deferred — review and schedule each manually.
      # Minor/patch (including security fixes) still flow.
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

### Change 3 — `CHANGELOG.md`: extend the existing dependabot.yml bullet

**Exact old block (single line under `### Changed`):**

```
- `.github/dependabot.yml` — defer major bumps for `typescript`, `react-oidc-context`, `tailwindcss`, `@typescript-eslint/*`, and `eslint` via `ignore` rules (each needs a dedicated migration; minor/patch still flow). Clears the CI-failing major PRs from the Dependabot backlog until those upgrades are scheduled.
```

**Exact new block:**

```
- `.github/dependabot.yml` — defer breaking/CI-blocking bumps via `ignore` rules (each needs a dedicated migration or eslint 9; minor/patch still flow). npm majors: `typescript`, `react-oidc-context`, `tailwindcss`, `@typescript-eslint/*`, `eslint`; plus `eslint-plugin-react-refresh` minor+major (0.5.x requires eslint 9 — unblocks the npm-minor-patch group, PR #65). docker: `node` major (stay on LTS 22; nginx minor still flows). github-actions: all majors (review each manually; minor/patch incl. security still flow). Clears the CI-failing/behind PRs (#65 #37 #35 #33 #32 #31) from the backlog until those upgrades are scheduled.
```

---

## Files Changed

| File | Change |
|------|--------|
| `.github/dependabot.yml` | add ignore rules: npm `eslint-plugin-react-refresh` minor+major; docker `node` major; github-actions `*` major |
| `CHANGELOG.md` | extend the existing dependabot.yml `### Changed` bullet |

---

## Rules

- `.github/dependabot.yml` must still parse:
  `python3 -c "import yaml,sys; yaml.safe_load(open('.github/dependabot.yml'))"` → no error.
- Indentation is **two spaces** per level, matching the existing file. The `ignore:`
  key aligns with `schedule:` (4 spaces); its list items are at 6 spaces; comment
  lines align with the list items.
- Exactly **2 files** in `git show --stat` (dependabot.yml + CHANGELOG.md).
- Do NOT touch `package.json` — main is already correctly pinned.
- Do NOT modify the npm `groups:` block or any existing ignore entry — only add.

---

## Definition of Done

- [ ] `.github/dependabot.yml` carries all three new ignore additions (react-refresh, docker node, github-actions `*`)
- [ ] `CHANGELOG.md` bullet replaced with the extended text
- [ ] `.github/dependabot.yml` parses as valid YAML
- [ ] `git show <sha> --stat` shows exactly 2 files changed
- [ ] Committed and pushed to `chore/dependabot-ignore-breaking-majors`
- [ ] Report the commit SHA back

**Commit message (exact):**
```
chore(dependabot): defer react-refresh, docker node, and github-actions majors
```

---

## What NOT to Do

- Do NOT create a PR (PR #64 already exists — this pushes to its branch)
- Do NOT skip pre-commit hooks (`--no-verify`)
- Do NOT modify `package.json`, workflow files, or any file other than the two listed
- Do NOT merge #64, #65, or any PR — merges are the owner's call
- Do NOT close #65 — that is a manual owner step after #64 merges
- Do NOT commit to `main` or to the spec branch `docs/dependabot-defer-plan` — work on `chore/dependabot-ignore-breaking-majors`

---

## Context (not part of the edit — for the owner, after #64 merges)

Once #64 merges: **close #65** with a pointer to #64 so Dependabot regenerates the
`npm-minor-patch` group **without** `eslint-plugin-react-refresh` (the group then
installs cleanly). #37 will auto-close (node major now ignored); #35/#33/#32/#31
auto-close (github-actions majors now ignored). #34 (nginx minor) stays open and is
safe to merge.
