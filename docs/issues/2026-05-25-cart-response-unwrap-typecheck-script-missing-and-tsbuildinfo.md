# Issue: cart response unwrap validation - missing `type-check` script and `tsbuildinfo` write failure

**Branch:** `fix/cart-response-unwrap`
**Repo:** `shopping-cart-frontend`
**Related spec:** `docs/bugs/2026-05-25-cart-service-response-not-unwrapped.md`

## What was tested

Attempted to run the spec-required TypeScript validation:

```bash
npm run type-check
npx tsc -b --pretty false
npx tsc -p tsconfig.json --noEmit --pretty false
```

## Actual output

`npm run type-check`:

```text
npm error Missing script: "type-check"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error Log files were not written due to an error writing to the directory: /Users/cliang/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

`npx tsc -b --pretty false`:

```text
error TS5033: Could not write file '/Users/cliang/src/gitrepo/personal/shopping-carts/shopping-cart-frontend/tsconfig.tsbuildinfo': EPERM: operation not permitted, open '/Users/cliang/src/gitrepo/personal/shopping-carts/shopping-cart-frontend/tsconfig.tsbuildinfo'.
```

`npx tsc -p tsconfig.json --noEmit --pretty false`:

```text
<no output; command succeeded>
```

## Root cause

- The repo does not define the `type-check` npm script referenced by the bug spec.
- The build-mode TypeScript invocation tries to write `tsconfig.tsbuildinfo`, which is blocked in this workspace.

## Recommended follow-up

- Add a `type-check` npm script or update the bug spec to reference the actual validation command.
- Prefer a no-emit TypeScript validation path for CI and local checks if incremental build artifacts are not writable in this environment.
