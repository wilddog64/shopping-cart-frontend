# npm-minor-patch Dependabot group fails Lint on a Prettier version bump

**Date:** 2026-08-02
**Symptom:** The weekly `npm-minor-patch` Dependabot group PR (#68, then recreated as #73)
fails the **Lint** job at the `prettier --check` step, even though the bump only touches
`package.json` / `package-lock.json`.

---

## Root cause

The group includes a Prettier version bump (**3.7.4 → 3.9.6**). Newer Prettier tightens a few
formatting defaults, so `npx prettier --check "src/**/*.{ts,tsx,css,json}"` flags two files that
were committed clean under the older Prettier and are still on `main`:

- `src/components/layout/ProtectedRoute.tsx`
- `src/types/index.ts`

`main`'s Lint passes because it pins the older Prettier; the failure only appears inside the
group PR where the new Prettier is installed. Test and Type Check pass — this is purely a
formatting-check mismatch, not a code break.

**Why #64's ignore rule only half-helped:** #64 deferred `eslint-plugin-react-refresh`
(the eslint-9 blocker), which cleared the group's Test/Type-Check failures. The Prettier
formatting drift is a separate cause it did not address.

---

## Fix (when the group PR is next taken)

Reformat the two files with the newer Prettier and commit to `main` (or onto the group branch):

```bash
npx prettier@^3.9 --write "src/components/layout/ProtectedRoute.tsx" "src/types/index.ts"
```

After that, the recreated `npm-minor-patch` group PR's Lint step passes and it can merge.
Doing this proactively on `main` clears the recurring red before the next weekly run.

---

## Status

- #68 → superseded/closed. #73 → closed by Dependabot ("updatable in another way") once the
  major bumps became ignored and the group recomposed. #86 → recreated group (12 updates),
  same Lint failure.
- **RESOLVED 2026-08-03** — PR #87 (**MERGED** `7e72de5`) pins Prettier `^3.9.6` on `main` and
  pre-formats `ProtectedRoute.tsx` + `types/index.ts` to the 3.9 style. Verified 3.7.4 rejects
  the 3.9 format, so the version bump was required (a reformat alone would move the red, not clear
  it). `main` CI (Prettier 3.9.6) now passes on these files; the recreated group #86 was rebased
  onto the fixed `main` and no longer needs its own Prettier bump.
- Process fix applied: the formatter version is now pinned (`^3.9.6`), so a future formatter
  minor/patch bump inside the group can still drift — the durable guard is a pinned exact version
  or a `prettier --write` pre-commit hook (follow-up, not done here).

## Process note

Pin the formatter version the CI `prettier --check` step uses, or run `prettier --write` in a
pre-commit hook, so a formatter minor/patch bump can't silently red-line unrelated files.
