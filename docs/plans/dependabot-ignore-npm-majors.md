# Defer all npm major bumps in Dependabot

**Branch:** `chore/dependabot-ignore-npm-majors`
**File:** `.github/dependabot.yml`, `CHANGELOG.md`
**Date:** 2026-08-02

---

## Problem

PR #64 deferred npm major bumps with a **per-package** ignore list (`typescript`,
`react-oidc-context`, `tailwindcss`, `@typescript-eslint/*`, `eslint`). The first weekly
Dependabot run after #64 merged opened **nine framework majors the list didn't name**:

| PR | Bump |
|----|------|
| #82 | react-dom + @types/react-dom → 19 |
| #80 | react + @types/react → 19 |
| #75 | react-router-dom 6 → 7 |
| #78 | zustand 4 → 5 |
| #77 | oidc-client-ts 2 → 3 |
| #74 | tailwind-merge 2 → 3 |
| #81 | lucide-react 0.303 → 1.28 |
| #79 | jsdom 23 → 30 |
| #76 | eslint-plugin-react-hooks 4 → 7 |

Each is a real migration (React 19, Router 7, …), not a safe rubber-stamp. A per-package
allowlist is the wrong shape: every new dependency that reaches a major re-opens this problem.

**Root cause:** major-bump deferral was expressed as an allowlist of names instead of a
blanket rule; the github-actions ecosystem already uses the correct blanket form.

---

## Decision (2026-08-02)

Defer **all** npm major bumps with a single `dependency-name: "*"` semver-major ignore —
mirroring the github-actions ecosystem rule already in this file. Minor/patch continue to
flow (grouped in `npm-minor-patch`). Keep the `eslint-plugin-react-refresh` **minor** ignore
(0.5.x requires eslint 9, itself a deferred major). Close PRs #74–#82 as deferred.

Majors are taken deliberately, one migration at a time, by removing/narrowing this rule when
an upgrade is scheduled — never auto-merged.

---

## Change — `.github/dependabot.yml` (npm `ignore:` block)

**Old:**

```yaml
    ignore:
      # Major bumps deferred — each needs a dedicated migration (breaking changes).
      # Minor/patch for these still flow. Revisit when scheduling the upgrades.
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-oidc-context"
        update-types: ["version-update:semver-major"]
      - dependency-name: "tailwindcss"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@typescript-eslint/*"
        update-types: ["version-update:semver-major"]
      - dependency-name: "eslint"
        update-types: ["version-update:semver-major"]
      - dependency-name: "eslint-plugin-react-refresh"
        update-types: ["version-update:semver-minor", "version-update:semver-major"]
```

**New:**

```yaml
    ignore:
      # All npm major bumps deferred — each needs a dedicated migration (React 19,
      # Router 7, zustand 5, oidc-client-ts 3, etc.). Review and schedule each
      # manually. Minor/patch still flow (grouped in npm-minor-patch above).
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
      # eslint-plugin-react-refresh minor also deferred — 0.5.x requires eslint 9,
      # which is itself a deferred major; keep this until the eslint 9 migration.
      - dependency-name: "eslint-plugin-react-refresh"
        update-types: ["version-update:semver-minor"]
```

---

## Files Changed

| File | Change |
|------|--------|
| `.github/dependabot.yml` | Replace npm per-package major list with `"*"` blanket major ignore |
| `CHANGELOG.md` | Update the `[Unreleased]` dependabot entry in place (fold, don't append) |

---

## Definition of Done

- [ ] `.github/dependabot.yml` valid (Dependabot config check green on the PR)
- [ ] PR CI green
- [ ] PR #73 note recorded separately (Prettier 3.7→3.9 formatting drift, out of scope here)
- [ ] PRs #74–#82 closed via `@dependabot close` after merge (ignore rule now on main)

## What NOT to Do

- Do NOT auto-merge any deferred major — migrations are taken deliberately
- Do NOT touch application source in this change (config + changelog only)
