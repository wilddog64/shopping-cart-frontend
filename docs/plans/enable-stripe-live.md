# Wire `VITE_STRIPE_PUBLISHABLE_KEY` into the frontend image build

**Branch (this repo):** `feat/stripe-live` (create from `origin/main`)
**Files:** `Dockerfile`, `.github/workflows/ci.yml`

---

## Problem

`src/config/stripe.ts` reads the publishable key at build time:

```ts
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null
```

Vite inlines `import.meta.env.VITE_*` at **build** time. The Dockerfile declares build ARGs
for every other `VITE_*` var (`VITE_KEYCLOAK_URL`, `VITE_ORDER_SERVICE_URL`, …) but **not**
`VITE_STRIPE_PUBLISHABLE_KEY`, and the CI workflow never passes it as a `build-arg`. So the
published image always builds with an empty key → `stripePromise` is `null` → Stripe Elements
is disabled in the deployed frontend.

The publishable key (`pk_test_…`) is **not a secret** — it is client-visible by design — so it
is supplied as a GitHub Actions **repository variable** (`vars`), not a secret. (The **secret**
`sk_…` key lives only in the payment service via Vault/ESO and never touches the frontend.)

---

## Fix

### Change 1 — `Dockerfile`: add the build ARG alongside the others

**Exact old block:**

```dockerfile
# Build arguments for environment variables
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM=shopping-cart
ARG VITE_CLIENT_ID=frontend
ARG VITE_ORDER_SERVICE_URL=/api/orders
ARG VITE_PRODUCT_SERVICE_URL=/api/products
ARG VITE_CART_SERVICE_URL=/api/cart
```

**Exact new block:**

```dockerfile
# Build arguments for environment variables
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM=shopping-cart
ARG VITE_CLIENT_ID=frontend
ARG VITE_ORDER_SERVICE_URL=/api/orders
ARG VITE_PRODUCT_SERVICE_URL=/api/products
ARG VITE_CART_SERVICE_URL=/api/cart
ARG VITE_STRIPE_PUBLISHABLE_KEY
```

> ARG values are exposed to the subsequent `RUN npm run build` as environment variables, so
> Vite picks up `VITE_STRIPE_PUBLISHABLE_KEY` — the same mechanism the existing ARGs rely on.
> No `ENV` line is needed (matches the existing pattern).

### Change 2 — `.github/workflows/ci.yml`: pass the build-arg in BOTH build steps

There are two `build-args:` blocks (the `build` job's Docker Build and the `publish` job's
Build/scan/push). Add the Stripe line to **both**, sourced from the repo variable.

**Exact old block (appears TWICE — apply to both):**

```yaml
          build-args: |
            VITE_KEYCLOAK_URL=${{ env.VITE_KEYCLOAK_URL }}
            VITE_KEYCLOAK_REALM=${{ env.VITE_KEYCLOAK_REALM }}
            VITE_CLIENT_ID=${{ env.VITE_CLIENT_ID }}
```

**Exact new block (apply to both):**

```yaml
          build-args: |
            VITE_KEYCLOAK_URL=${{ env.VITE_KEYCLOAK_URL }}
            VITE_KEYCLOAK_REALM=${{ env.VITE_KEYCLOAK_REALM }}
            VITE_CLIENT_ID=${{ env.VITE_CLIENT_ID }}
            VITE_STRIPE_PUBLISHABLE_KEY=${{ vars.VITE_STRIPE_PUBLISHABLE_KEY }}
```

> Use `vars.` (repository variable), NOT `secrets.` and NOT `env.` — the value is publishable
> and set once in repo settings. If the variable is unset, the build-arg is empty and the
> frontend simply falls back to Elements-disabled (no build break).

---

## Owner step (outside this change — do not put the key in git)

Set the repository variable once (publishable key, safe to store as a plain variable):

```bash
gh variable set VITE_STRIPE_PUBLISHABLE_KEY \
  --repo wilddog64/shopping-cart-frontend --body 'pk_test_...'
```

---

## Files Changed

| File | Change |
|------|--------|
| `Dockerfile` | add `ARG VITE_STRIPE_PUBLISHABLE_KEY` in the build-args block |
| `.github/workflows/ci.yml` | add `VITE_STRIPE_PUBLISHABLE_KEY=${{ vars.VITE_STRIPE_PUBLISHABLE_KEY }}` to BOTH `build-args:` blocks |

---

## Rules

- No `pk_test`/`sk` value hardcoded anywhere — the key is a repo variable only.
- Do not touch any other `VITE_*` var, the `env:` block, or `src/`.
- `ci.yml` must remain valid YAML (both build-args blocks updated identically).

---

## Definition of Done

- [ ] `Dockerfile` declares `ARG VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] BOTH `build-args:` blocks in `ci.yml` pass `VITE_STRIPE_PUBLISHABLE_KEY=${{ vars.VITE_STRIPE_PUBLISHABLE_KEY }}`
- [ ] No key value committed to git
- [ ] Committed and pushed to `feat/stripe-live`
- [ ] memory-bank updated with commit SHA and task status

**Commit message (exact):**
```
build(frontend): wire VITE_STRIPE_PUBLISHABLE_KEY into image build
```

---

## What NOT to Do

- Do NOT create a PR
- Do NOT skip pre-commit hooks (`--no-verify`)
- Do NOT modify any file other than `Dockerfile` and `.github/workflows/ci.yml`
- Do NOT hardcode a publishable or secret Stripe key anywhere in the repo
- Do NOT use `secrets.` for this value — it is publishable; use `vars.`
- Do NOT commit to `main` — work on `feat/stripe-live`
- Do NOT branch from anything but `origin/main`
