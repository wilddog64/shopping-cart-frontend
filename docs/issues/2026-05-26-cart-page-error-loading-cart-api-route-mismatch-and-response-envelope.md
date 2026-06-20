# Cart page shows "Error loading cart" because the frontend cart API path does not match basket-service

**Date:** 2026-05-26  
**Severity:** High (authenticated cart page cannot load)
**Affects:** `shopping-cart-frontend`

## Problem

The authenticated cart page renders a red `Error loading cart` message instead of cart
contents.

The frontend is requesting `GET /api/cart`, but the basket service only exposes
`GET /api/v1/cart`. As a result, the request routed through `nginx.conf` does not match
the backend route contract and fails before cart data can be rendered.

There is a second contract issue behind the route mismatch: basket-service returns a
standard wrapper payload (`{ success: true, data: ... }`), while the frontend cart service
currently treats `response.data` as the raw `Cart` object. Even after the route is fixed,
the frontend must unwrap `response.data.data` to avoid parsing the response envelope as
the cart model.

## Evidence

Frontend endpoint configuration:

- [`src/config/api.ts`](../../src/config/api.ts) sets `CART_SERVICE_URL` to `/api/cart`
- [`nginx.conf`](../../nginx.conf) proxies `location /api/cart` to basket-service

Basket service route contract:

- [`shopping-cart-basket/cmd/server/main.go`](../../../shopping-cart-basket/cmd/server/main.go)
  registers cart routes under `/api/v1/cart`
- [`shopping-cart-basket/docs/api/README.md`](../../../shopping-cart-basket/docs/api/README.md)
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
