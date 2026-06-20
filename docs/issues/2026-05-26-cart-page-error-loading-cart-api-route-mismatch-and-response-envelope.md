# Cart page shows "Error loading cart" because the frontend cart API path does not match basket-service

**Date:** 2026-05-26 (filed); resolved across v0.1.2 + the 2026-06-19 dev-proxy fix  
**Severity:** High (authenticated cart page cannot load)
**Affects:** `shopping-cart-frontend`

## Status (updated 2026-06-20) — RESOLVED

All three layers now agree on `/api/v1/cart`:

- **Production proxy (`nginx.conf`) — fixed in v0.1.2.** `location /api/cart` already
  `proxy_pass`es to basket-service `/api/v1/cart`.
- **Response envelope (`src/services/cartService.ts`) — fixed in v0.1.2.** Already unwraps
  `response.data.data` from the `{ success, data }` payload.
- **Dev proxy (`vite.config.ts`) — fixed 2026-06-19.** Added a `rewrite` so `vite dev`
  also rewrites `/api/cart` → `/api/v1/cart`. This was the last layer still forwarding the
  path verbatim, so the failure described below reproduced **only under `vite dev`**.

The original report below is retained for history.

## Problem

The authenticated cart page renders a red `Error loading cart` message instead of cart
contents.

The frontend requests `GET /api/cart`, but the basket service only exposes
`GET /api/v1/cart`. The proxy layer that forwarded `/api/cart` verbatim (the Vite dev
server) did not match the backend route contract, so the request failed before cart data
could be rendered. (Production via `nginx.conf` already rewrote the path correctly.)

A second contract issue sits behind the route mismatch: basket-service returns a standard
wrapper payload (`{ success: true, data: ... }`), and the frontend cart service must unwrap
`response.data.data` rather than treat `response.data` as the raw `Cart` object. This was
addressed in `src/services/cartService.ts` (v0.1.2).

## Evidence

Frontend endpoint configuration:

- [`src/config/api.ts`](../../src/config/api.ts) sets `CART_SERVICE_URL` to `/api/cart`
- [`nginx.conf`](../../nginx.conf) proxies `location /api/cart` to basket-service

Basket service route contract:

- [`shopping-cart-basket cmd/server/main.go`](https://github.com/wilddog64/shopping-cart-basket/blob/main/cmd/server/main.go)
  registers cart routes under `/api/v1/cart`
- [`shopping-cart-basket docs/api/README.md`](https://github.com/wilddog64/shopping-cart-basket/blob/main/docs/api/README.md)
  documents the same `/api/v1/cart` base path and the `{ success, data }` response envelope

Frontend cart loading path:

- [`src/hooks/useCart.ts`](../../src/hooks/useCart.ts) calls `cartService.getCart()`
- [`src/pages/CartPage.tsx`](../../src/pages/CartPage.tsx) renders `Error loading cart` when
  the `useCart()` query rejects

## Root Cause

1. The frontend cart base path is `/api/cart`, but basket-service serves `/api/v1/cart`.
2. The frontend cart client also assumes the backend returns a bare `Cart`, while the
   basket API wraps results in `{ success, data }`.

The route mismatch is the immediate cause of the page error. The response-envelope mismatch
is the next failure that must be fixed once the correct route is used.

## Reproduction

1. Sign in to the frontend.
2. Open `/cart`.
3. Observe the page briefly load, then render `Error loading cart`.

## Expected Result

The cart page should load the authenticated user’s cart, render the line items, and show
the order summary instead of the error message.

## Fix

1. Point the frontend cart client at the basket-service v1 path expected by the backend.
2. Unwrap the basket-service response envelope in `cartService.getCart()` and the cart
   mutation methods so the app consumes `response.data.data` as the `Cart`.

## Files Likely to Change

- `src/config/api.ts`
- `src/services/cartService.ts`
- `nginx.conf` if the proxy needs to be aligned with the backend path contract

## Follow-up

- Update or add cart-page tests to cover the route contract and the wrapped response shape.
- Verify the authenticated cart page no longer surfaces `Error loading cart` after the fix.
