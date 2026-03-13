## CI Status (as of 2026-03-13)

**Branch:** `fix/ci-stabilization` — PR #1 open

| Job | Status |
|---|---|
| Type Check | ✅ pass |
| Test | ✅ pass |
| Lint | ❌ fail |

**Lint failure:** `react-refresh/only-export-components` warnings in:
- `src/components/ui/Badge.tsx` line 32
- `src/components/ui/Button.tsx` line 55
- `src/test/test-utils.tsx` lines 18, 30

`--max-warnings 0` treats these as errors. Fix: either disable the rule for these files
or refactor to satisfy fast-refresh (move non-component exports to separate files).

**Spec:** `wilddog64/shopping-cart-infra` → `docs/plans/ci-stabilization-round3.md` (c5797539)

---# Active Context: Shopping Cart Frontend

## Current State

The frontend application is functionally complete as a standalone SPA. All primary features — product browsing, cart management, order tracking, and Keycloak authentication — are implemented and have both unit tests and Playwright E2E coverage.

## Implemented Features

- Home page with hero section and feature highlights
- Products page with listing, pagination, and category filter
- Product detail page
- Cart page (add, update quantity, remove, checkout flow)
- Orders page (history listing)
- Order detail page (individual order with status)
- Login/Logout via Keycloak OIDC
- `ProtectedRoute` guards on `/cart` and `/orders`
- Header with cart item count badge (Zustand)
- 404 Not Found page
- Login callback page (`/callback`)

## Project Structure — Files Present

Key source files confirmed present:
- `src/App.tsx` — route definitions
- `src/main.tsx` — provider setup
- `src/config/auth.ts` — OIDC config
- `src/config/api.ts` — API endpoint URLs
- `src/stores/cartStore.ts` + `cartStore.test.ts`
- `src/types/index.ts` — all domain types
- `src/utils/cn.ts` + `format.ts` + `format.test.ts`
- `src/components/ui/Button.tsx` + `Button.test.tsx`
- `src/components/ui/Card.tsx`, `Badge.tsx`, `Input.tsx`, `LoadingSpinner.tsx`
- `src/components/layout/Header.tsx`, `Footer.tsx`, `Layout.tsx`, `ProtectedRoute.tsx`
- `src/hooks/useProducts.ts` (and likely useCart, useOrders)
- `src/test/setup.ts` + `test-utils.tsx`
- `e2e/home.spec.ts`, `products.spec.ts`, `cart.spec.ts`, `orders.spec.ts`, `navigation.spec.ts`

## Active Areas of Work

Based on the codebase structure, the implementation appears stable. Likely active areas if work continues:

1. **Page components**: The pages directory (`src/pages/`) is referenced but contents were not individually listed — all 7 page components (HomePage, ProductsPage, ProductDetailPage, CartPage, OrdersPage, OrderDetailPage, LoginCallback, NotFoundPage) should exist
2. **Service files**: `src/services/` should contain `api.ts`, `productService.ts`, `cartService.ts`, `orderService.ts`
3. **Additional hooks**: `src/hooks/` should contain `useCart.ts` and `useOrders.ts` alongside the confirmed `useProducts.ts`

## Recent Configuration Details

- Vite dev server runs on port 3000 (not the default 5173)
- TanStack Query client: `staleTime: 300000` (5 min), `retry: 1`, `refetchOnWindowFocus: false`
- Zustand persistence: only `itemCount` field is persisted, key `cart-storage`
- Playwright config: `baseURL` from `FRONTEND_URL` env or `http://localhost:3000`
- GitHub Actions CI: runs on push and PR to main

## Known Integration Points

- The nginx proxy configuration in `nginx.conf` must be kept in sync with backend service hostnames when deployed to Kubernetes
- Keycloak realm `shopping-cart` and client `frontend` must be pre-configured before the app can authenticate
- The `shopping-cart-infra` repo contains the Keycloak deployment with realm config at `identity/config/realm-shopping-cart.json`

## CI Blocker — OPEN (2026-03-11)

**Failing since:** 2026-03-09
**Failing steps:** `Lint → Run ESLint` + `Type Check → Run TypeScript compiler`

**Errors:**
```
ESLint:
- src/components/layout/Header.tsx: 'Package' is defined but never used
- src/components/layout/ProtectedRoute.tsx: 'Navigate' is defined but never used
- src/stores/cartStore.ts: 'CartItem' is defined but never used

TypeScript:
- src/config/api.ts: Property 'env' does not exist on type 'ImportMeta'
- src/config/auth.ts: Property 'env' does not exist on type 'ImportMeta'
  (missing vite/client type definitions in tsconfig.json)
```

**Fix:**
1. Remove unused imports in `Header.tsx`, `ProtectedRoute.tsx`, `cartStore.ts`
2. Add `"types": ["vite/client"]` to `tsconfig.json` compilerOptions

**Priority:** P1 — assigned to v0.8.0 milestone. See `k3d-manager/docs/issues/2026-03-11-shopping-cart-ci-failures.md`.
