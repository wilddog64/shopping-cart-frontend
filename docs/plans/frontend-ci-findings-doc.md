# Task: file the frontend CI investigation findings as a docs/issues note

**Repo:** `shopping-cart-frontend`
**Branch (create from `origin/main`):** `docs/frontend-ci-findings`
**Deliverable (ONE new file):** `docs/issues/2026-07-30-frontend-ci-eslint-peer-strict-stall-deploy-gh006.md`

This is a documentation-only task. Create the deliverable file with the **exact
verbatim content** in the block below. Do not investigate, re-derive, edit, or
add anything — the findings are already verified. Do not touch any other file.

---

## Before You Start

- `git fetch origin` then `git checkout -b docs/frontend-ci-findings origin/main`
  (if the branch already exists on origin, `git checkout docs/frontend-ci-findings && git pull origin docs/frontend-ci-findings`).
- Confirm you are NOT on `main`.

---

## Deliverable — create this file verbatim

Path: `docs/issues/2026-07-30-frontend-ci-eslint-peer-strict-stall-deploy-gh006.md`

Exact content (copy everything between the fences, without the fences):

~~~markdown
# Frontend CI: real blockers are an ESLint peer conflict, strict-mode serialization, and a broken deploy push — NOT Node.js

**Date:** 2026-07-30
**Context:** Investigating why the frontend PR queue is stuck and CI is failing.
The working hypothesis was "CI fails because we use a lower Node.js version."
That hypothesis is **refuted** — see "Not the cause" below. There are three
distinct real issues.

## Not the cause — Node.js version

`main` and every open PR head set `NODE_VERSION: '22'` in `.github/workflows/ci.yml`
(all 6 `setup-node` steps), which satisfies `package.json` `engines:
"^20.19.0 || >=22.12.0"`. No job fails on the Node version. The historical
Node-20 deprecation was already fixed (PRs #19 `1ce1dfc`, #60 `954730a`; see
`2026-05-22-nodejs20-deprecation.md`). Do not spend more time on the Node theory.

## 1. ESLint peer-dependency conflict (PR #65, `npm-minor-patch` group) — the actual CI failure

`Lint`, `Test`, and `Type Check` all fail at the **Install dependencies** step
(before any lint/test/tsc runs) with `npm error code ERESOLVE`.

Root cause: the grouped minor/patch bump raised `eslint-plugin-react-refresh` to
`0.5.3`, whose peer requirement is `eslint@"^9 || ^10"`. The root project pins
`eslint@"^8.56.0"` (resolves to `eslint@8.57.1`), and the eslint 9 major is
**deliberately deferred** via the Dependabot `ignore` rules. The two are mutually
exclusive, so `npm ci` aborts.

Log excerpt (run `30594158101`, `Lint` job):

```
npm error code ERESOLVE
npm error While resolving: eslint-plugin-react-refresh@0.5.3
npm error Found: eslint@8.57.1
npm error   dev eslint@"^8.56.0" from the root project
npm error peer eslint@"^9 || ^10" from eslint-plugin-react-refresh@0.5.3
npm error Conflicting peer dependency: eslint@10.8.0
```

**Fix (pick one):**
- **Smallest / unblocks #65 now:** pin `eslint-plugin-react-refresh` to its
  eslint-8-compatible line (`0.4.x`) and add it to the Dependabot deferred-bump
  `ignore` list until eslint 9 is scheduled.
- **Larger:** schedule the eslint 8 → 9 migration (also clears the deferred
  eslint major).
- Do **NOT** paper over it with `--force` / `--legacy-peer-deps` in CI — that
  masks a real runtime incompatibility.

## 2. `strict: true` + auto-merge backlog → BEHIND serialization stall

Branch protection requires branches be up to date before merging (`strict: true`).
The open auto-merge Dependabot PRs (#31 #32 #33 #34 #35 #37 #64, plus historically
#41 #43 #45) each pass their required checks but cannot all stay current: every
merge to `main` flips the rest to `BEHIND`, so they serialize and stall. This is a
merge-ordering starvation, **not** a CI failure. It clears itself as PRs merge one
at a time (Dependabot rebases the next). If throughput matters, temporarily relax
`strict` or merge the batch in a deliberate sequence.

## 3. `Build, Scan, Push & Deploy` fails on `main` — GH006 protected-branch push

The deploy job attempts to push a manifest image-tag commit back to protected
`main` and is blocked: `GH006: Protected branch update failed`. This check is
**not required** (it does not gate PR merges), but the image-tag auto-update
automation is broken. Fix by giving the deploy job a bypass path (a deploy
key / app token permitted to push to `main`, or open a PR for the tag bump
instead of a direct push), or move the image-tag write off the protected branch.
~~~

---

## Definition of Done

- [ ] `docs/issues/2026-07-30-frontend-ci-eslint-peer-strict-stall-deploy-gh006.md` exists with the exact content above
- [ ] `git show <sha> --stat` shows exactly **1 file changed** (the new doc only)
- [ ] Committed and pushed to `origin/docs/frontend-ci-findings`
- [ ] Report the commit SHA back

**Commit message (exact):**
```
docs(issues): record frontend CI blockers (eslint peer, strict stall, deploy GH006)
```

---

## What NOT to Do

- Do NOT create a PR
- Do NOT skip pre-commit hooks (`--no-verify`)
- Do NOT modify `package.json`, `.github/`, or any file other than the one new doc
- Do NOT actually apply any of the fixes described in the note — this task only
  records the findings; the fixes are separate follow-ups
- Do NOT commit to `main` — work on `docs/frontend-ci-findings`
