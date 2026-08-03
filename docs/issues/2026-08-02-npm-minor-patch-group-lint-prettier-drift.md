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
  major bumps became ignored and the group recomposed. The group will be recreated on the next
  weekly run and will hit this same Prettier drift until the two files are reformatted on `main`.
- Deferred by user decision (2026-08-02): investigate only, do not merge the group this session.

## Process note

Pin the formatter version the CI `prettier --check` step uses, or run `prettier --write` in a
pre-commit hook, so a formatter minor/patch bump can't silently red-line unrelated files.
