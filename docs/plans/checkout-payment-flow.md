# Feature: Working checkout with simulated payment

**Repo:** `shopping-cart-frontend`
**Branch (all work):** `feat/checkout-payment`
**Scope:** frontend only — **no backend changes.** The order/payment/basket services already
satisfy every step of this flow.

---

## Before You Start

- `git pull origin feat/checkout-payment` and read this spec in full.
- Read these files before editing:
  - `src/config/api.ts`
  - `src/services/api.ts`, `src/services/orderService.ts`, `src/services/cartService.ts`
  - `src/hooks/useCart.ts`, `src/hooks/useOrders.ts`
  - `src/pages/CartPage.tsx`
  - `src/types/` (Order, Cart, OrderStatus)
  - `src/App.tsx` (or wherever routes are declared)
  - `nginx.conf`
- Run the app's existing checks once before starting so you know the baseline:
  `npm run lint && npm run test && npm run build`.

---

## Problem (verified live on `ubuntu-hostinger`, 2026-07-15)

Users cannot check out. The current `CartPage` "Proceed to Checkout" button calls
`cartService.checkout()` → basket `POST /api/cart/checkout`, which **publishes a `cart.checkout`
event that no service consumes** and returns a cart (no `orderId`). The page then navigates to
`/orders/undefined`. **No order is ever created and payment is never called.**

The **intended** flow (defined by the e2e acceptance suite `tests/flows/checkout-flow.spec.ts`
and `tests/flows/payment-flow.spec.ts`) is frontend-orchestrated and synchronous:

1. `POST /api/orders` (createOrder) → order `PENDING`
2. `POST /api/payments` (processPayment via the **mock gateway**, already enabled) → `COMPLETED`
3. `PATCH /api/orders/{orderId}/status` `{status: PAID, paymentId, paymentMethod}` → order `PAID`

The deployed backend already implements all three. The frontend never does. This spec builds the
frontend orchestration + UI.

---

## Backend contracts (already deployed — do not change, just call)

**Order — `POST /api/orders`** (proxied to `order-service:8081`)
Body `CreateOrderRequest`:
```json
{
  "customerId": "string",
  "items": [{ "productId": "string", "productName": "string", "quantity": 1, "unitPrice": 0.0 }],
  "shippingAddress": { "street": "", "city": "", "state": "", "postalCode": "", "country": "" },
  "currency": "USD"
}
```
Returns `OrderResponse` with `{ id, status: "PENDING", totalAmount, items, shippingAddress, ... }`.

**Order status — `PATCH /api/orders/{orderId}/status`**
Body `UpdateOrderStatusRequest`: `{ "status": "PAID", "paymentId": "<uuid>", "paymentMethod": "CARD" }`
Flips the order to `PAID` and emits `order.paid`.

**Payment — `POST /api/payments`** (NEW nginx route below → `payment-service:8084/api/v1/payments`)
Body `ProcessPaymentRequest`:
```json
{
  "orderId": "string", "customerId": "string", "amount": 0.0, "currency": "USD",
  "gateway": "mock",
  "cardNumber": "string", "cardExpMonth": "string", "cardExpYear": "string",
  "cardCvc": "string", "cardholderName": "string",
  "idempotencyKey": "string"
}
```
Returns `PaymentResponse` `{ id, orderId, status: "COMPLETED" | "FAILED", cardLast4, cardBrand, failureReason, ... }`.

**Mock gateway test triggers (already built — no backend work):**
- Any normal card number → **COMPLETED**
- `4000000000000002` → **declined** (`failureReason: "Your card was declined"`)
- `4000000000009995` → **insufficient funds**

---

## Payment methods to offer (product decision)

The checkout UI offers three tender choices:

1. **Card** — real card form (number, exp month/year, CVC, cardholder name). Posts the card fields.
2. **Bank (simulated)** — routing + account number fields (cosmetic). Posts through the mock
   gateway with `gateway: "mock"` and **no card number** (mock approves card-less requests as
   success), `paymentMethod: "BANK"` sent to the order status update. This simulates a successful
   ACH/bank payment.
3. **Test decline** — a helper option that fills the declining card `4000000000000002` so the
   failure UI can be demoed. (Deterministic decline is card-path only; a bank-specific decline is
   not supported by the current payment DTO and is intentionally out of scope — noted as follow-up.)

`paymentMethod` string sent to the order status PATCH: `"CARD"` for card/test-decline, `"BANK"` for bank.

---

## Changes

### 1. `nginx.conf` — add the payment route

**New block** (mirror the existing `/api/orders` block; add after it). Payment lives in the
`shopping-cart-payment` namespace on port 8084, base path `/api/v1/payments`:

```nginx
    location /api/payments {
        proxy_pass http://payment-service.shopping-cart-payment.svc.cluster.local:8084/api/v1/payments;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```
(Copy the exact `proxy_set_header` lines from the existing `/api/orders` block so headers match.)

### 2. `src/config/api.ts` — add payment config + endpoints

- Add `PAYMENT_SERVICE_URL: import.meta.env.VITE_PAYMENT_SERVICE_URL || '/api/payments'` to `API_CONFIG`.
- Add to `ENDPOINTS`:
  - `PAYMENTS: ${API_CONFIG.PAYMENT_SERVICE_URL}`
  - `ORDER_STATUS: (id: string) => ${API_CONFIG.ORDER_SERVICE_URL}/${id}/status`

### 3. `src/services/orderService.ts` — add `createOrder` + `updateOrderStatus`

Follow the existing axios `api` + `ENDPOINTS` pattern in the file. Add:
- `createOrder(req: CreateOrderRequest): Promise<Order>` → `api.post(ENDPOINTS.ORDERS, req)`
- `updateOrderStatus(id, body): Promise<Order>` → `api.patch(ENDPOINTS.ORDER_STATUS(id), body)`

### 4. `src/services/paymentService.ts` — NEW

Mirror `orderService.ts` structure. Export `paymentService.processPayment(req: PaymentRequest):
Promise<PaymentResponse>` → `api.post(ENDPOINTS.PAYMENTS, req)`. Generate an `idempotencyKey`
(`crypto.randomUUID()`) per attempt.

### 5. `src/types/` — add payment + order-status types

Add `PaymentRequest`, `PaymentResponse`, `CreateOrderRequest`, and a `PaymentMethod = 'CARD' | 'BANK'`
type matching the contracts above. Reuse the existing `Order` / `Address` types.

### 6. `src/hooks/useCart.ts` — rewrite `useCheckout`

Replace the `cartService.checkout()` mutation with an orchestration mutation that takes
`{ shippingAddress, payment }` and:
1. reads the current cart (or receives it),
2. `orderService.createOrder(...)` from cart items → order (PENDING),
3. `paymentService.processPayment({ orderId: order.id, amount: order.totalAmount, ... })`,
4. if payment `FAILED` → throw with `failureReason` (do NOT flip status, do NOT clear cart),
5. if `COMPLETED` → `orderService.updateOrderStatus(order.id, { status: 'PAID', paymentId, paymentMethod })`,
6. `cartService.clearCart()`,
7. return the order.

Invalidate `['cart']` and `['orders']` query keys on success.

### 7. `src/pages/CheckoutPage.tsx` — NEW

- Order summary (items + total) from the cart.
- Shipping address form (street/city/state/postalCode/country).
- Payment method selector: **Card** / **Bank** / **Test decline** (see section above).
- Submit → `useCheckout` mutation. On success → navigate to `/orders/${order.id}`.
  On failure → show the `failureReason` inline; keep the cart intact so the user can retry.
- Require auth to reach this page (checkout is where identity is validated).

### 8. Routing + `CartPage.tsx`

- Add a `/checkout` route rendering `CheckoutPage`.
- Change `CartPage` "Proceed to Checkout" `handleCheckout` to `navigate('/checkout')` — remove the
  `cartService.checkout()` call. (Leave `cartService.checkout()` in place for now; it is retired by
  no longer being called. Do not delete the basket endpoint.)

---

## Definition of Done

- [ ] `npm run lint` — zero new warnings/errors
- [ ] `npm run test` — existing tests pass; add unit tests for `useCheckout` orchestration
      (success, payment-declined, and bank-success paths) and `paymentService`
- [ ] `npm run build` — succeeds
- [ ] Manual/e2e: card success → order `PAID`; card `4000000000000002` → decline shown, cart intact,
      order NOT PAID; bank → success → order `PAID`
- [ ] Committed and pushed to `feat/checkout-payment`
- [ ] memory-bank updated with the commit SHA and task status

**Commit message (exact):**
```
feat(checkout): frontend-orchestrated checkout with simulated payment

Wire cart -> createOrder -> processPayment (mock gateway) -> order PAID.
Add card/bank/test-decline tenders and the /api/payments nginx route.
```

---

## What NOT to Do

- Do NOT change any backend service (order, payment, basket) — the contracts already exist.
- Do NOT create a PR.
- Do NOT skip pre-commit hooks (`--no-verify`).
- Do NOT commit to `main` — work on `feat/checkout-payment`.
- Do NOT modify files outside `shopping-cart-frontend`.
- Do NOT delete the basket `/checkout` endpoint or `cartService.checkout()` — just stop calling it.

---

## Follow-ups (out of scope — do not implement here)

- Guest cart (Amazon-style) is the **next** spec/PR (`shopping-cart-basket` + this frontend).
  Checkout here still assumes an authenticated customer.
- Bank-specific deterministic decline needs a `paymentMethod` + bank fields on the payment DTO;
  deferred until the payment Go rewrite lands.
