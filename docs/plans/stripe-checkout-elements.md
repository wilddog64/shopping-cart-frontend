# Phase E — Frontend: Stripe Elements checkout

**Repo:** `shopping-cart-frontend`  **Branch:** `feat/stripe-checkout-elements` (off `main`)
**Design:** `docs/plans/stripe-checkout-orchestration-design.md`
**Implements & supersedes** the planning note `docs/plans/stripe-test-card-checkout.md`.
**Depends on:** Phase C (order orchestrator `POST /api/orders/checkout`) at runtime — this branch
needs no Phase C *code* (it only calls the HTTP endpoint), so it branches off `main` and can be
written now. Live smoke needs a running order service on the C branch + a `pk_test_…` key.

---

## Objective

Replace the address-only basket checkout with a Stripe Elements card flow that calls the order
orchestrator. The browser tokenizes the card with Stripe.js (`createPaymentMethod`) and sends
**only** the PaymentMethod id to `POST /api/orders/checkout`. The frontend never sees or sends a
PAN/CVC, never computes or sends an amount, and never marks an order paid on its own — it renders
whatever `paymentStatus` the orchestrator returns.

**Critical correction vs. the old planning note:** the frontend does **NOT** call the payment
service (`POST /api/v1/payments`) and does **NOT** send `amount`/`currency`/`customerId`. Those are
the orchestrator's job (Phase C recomputes the amount server-side from the basket). The frontend's
only new backend call is `POST /api/orders/checkout` with `{ shippingAddress, paymentMethodId }`.

**Behavior:**
- Empty/invalid address → inline field errors, no tokenization, no checkout call (unchanged rule).
- Card tokenization fails → show the Stripe error message, no checkout call.
- `POST /api/orders/checkout` → **200 `paymentStatus:"PAID"`** → navigate to `/orders/{orderId}`; the
  cart query is invalidated so it refetches the now-empty (server-cleared) cart.
- **402 `paymentStatus:"FAILED"`** → show `failureReason`, stay on the page (retryable), cart intact.

Every code block below was written into the tree, type-checked (`tsc --noEmit`), lint-clean
(`eslint --max-warnings 0`), production-built (`vite build`), and unit-tested (vitest: 26 passed),
then reverted — this spec carries the proven code.

---

## Before You Start

- `git checkout feat/stripe-checkout-elements && git pull origin feat/stripe-checkout-elements`
- Read `src/pages/CheckoutPage.tsx`, `src/pages/CheckoutPage.test.tsx`, `src/hooks/useCart.ts`,
  `src/services/orderService.ts`, `src/config/api.ts`, `src/types/index.ts`, `src/services/api.ts`
  (the axios instance + response interceptor), `.env.example`.
- Node 26 / npm 11 confirmed working. Resolved dep versions: `@stripe/stripe-js@^9.12.1`,
  `@stripe/react-stripe-js@^6.8.0` (see Change 1 — install, don't hand-edit the lockfile).

---

## Change 1 — `package.json` + lockfile: add Stripe deps

Install (this updates `package.json` **and** `package-lock.json`; commit both):

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Resulting `dependencies` additions (alphabetical, top of the block):
```json
    "@stripe/react-stripe-js": "^6.8.0",
    "@stripe/stripe-js": "^9.12.1",
```
> Do NOT downgrade or pin to different majors — `react-stripe-js` v6 + `stripe-js` v9 are what the
> proven code was type-checked against. `createPaymentMethod`, `Elements`, `CardElement`,
> `useStripe`, `useElements` are all stable in these majors.

---

## Change 2 — `.env.example`: publishable key

**Old:**
```
# API Endpoints (proxied through Vite in development)
VITE_ORDER_SERVICE_URL=/api/orders
VITE_PRODUCT_SERVICE_URL=/api/products
VITE_CART_SERVICE_URL=/api/cart
```
**New:**
```
# API Endpoints (proxied through Vite in development)
VITE_ORDER_SERVICE_URL=/api/orders
VITE_PRODUCT_SERVICE_URL=/api/products
VITE_CART_SERVICE_URL=/api/cart

# Stripe publishable TEST key (pk_test_…). Non-secret; safe in the browser
# bundle. The secret key (sk_test_…) is server-side only, never here.
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```
> Only the **publishable** (`pk_test_…`) key belongs here. A secret key (`sk_test_…`/`sk_live_…`)
> must never appear in any `VITE_*` variable — Vite inlines those into the client bundle.

---

## Change 3 — new file `src/config/stripe.ts`

```ts
import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Publishable test key (pk_test_…). Publishable keys are non-secret and safe in
// the browser bundle. When unset, stripePromise is null and the checkout page
// surfaces a clear "payments not configured" message instead of crashing.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

export const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null
```

---

## Change 4 — `src/config/api.ts`: add the checkout endpoint

**Old:**
```ts
  // Order endpoints
  ORDERS: `${API_CONFIG.ORDER_SERVICE_URL}`,
  ORDER_BY_ID: (id: string) => `${API_CONFIG.ORDER_SERVICE_URL}/${id}`,
} as const
```
**New:**
```ts
  // Order endpoints
  ORDERS: `${API_CONFIG.ORDER_SERVICE_URL}`,
  ORDER_BY_ID: (id: string) => `${API_CONFIG.ORDER_SERVICE_URL}/${id}`,
  ORDER_CHECKOUT: `${API_CONFIG.ORDER_SERVICE_URL}/checkout`,
} as const
```
> `ORDER_SERVICE_URL` defaults to `/api/orders`, so the endpoint resolves to `/api/orders/checkout`
> — exactly the route Phase C registers.

---

## Change 5 — `src/types/index.ts`: request + result types

Add immediately after the existing `CheckoutRequest` interface:

**Old:**
```ts
export interface CheckoutRequest {
  shippingAddress: Address
}
```
**New:**
```ts
export interface CheckoutRequest {
  shippingAddress: Address
}

// Order-service orchestrator checkout (POST /api/orders/checkout).
export interface OrderCheckoutRequest {
  shippingAddress: Address
  paymentMethodId: string
}

export type CheckoutResult =
  | { status: 'PAID'; orderId: string; amount: string; currency: string }
  | { status: 'FAILED'; orderId: string; retryable: boolean; failureReason: string }
```
> `CheckoutRequest` (basket-shaped) stays for `cartService`; the new orchestrator flow uses
> `OrderCheckoutRequest`. `amount` is a **string** — it comes back from the orchestrator as
> `StringFixed(2)`; the frontend only displays it, never parses it into a charge.

---

## Change 6 — `src/services/orderService.ts`: add `checkout`

**Old (imports + params):**
```ts
import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Order, PaginatedResponse } from '@/types'

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  status?: string
  customerId?: string
}
```
**New:**
```ts
import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Order, PaginatedResponse, OrderCheckoutRequest, CheckoutResult } from '@/types'

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  status?: string
  customerId?: string
}

interface CheckoutResponseBody {
  orderId: string
  amount: string
  currency: string
  paymentStatus: 'PAID' | 'FAILED'
  retryable?: boolean
  failureReason?: string
}
```

**Old (end of the service object):**
```ts
  async cancelOrder(id: string): Promise<Order> {
    const response = await api.post<Order>(`${ENDPOINTS.ORDER_BY_ID(id)}/cancel`)
    return response.data
  },
}
```
**New:**
```ts
  async cancelOrder(id: string): Promise<Order> {
    const response = await api.post<Order>(`${ENDPOINTS.ORDER_BY_ID(id)}/cancel`)
    return response.data
  },

  // Payment-aware checkout orchestrator. 402 (payment declined) is a normal,
  // non-exceptional result — validateStatus lets it through so the structured
  // {paymentStatus:"FAILED", retryable, failureReason} body is preserved rather
  // than being flattened into an Error by the global response interceptor.
  async checkout(req: OrderCheckoutRequest): Promise<CheckoutResult> {
    const response = await api.post<CheckoutResponseBody>(ENDPOINTS.ORDER_CHECKOUT, req, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 402,
    })
    const body = response.data
    if (body.paymentStatus === 'PAID') {
      return {
        status: 'PAID',
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency,
      }
    }
    return {
      status: 'FAILED',
      orderId: body.orderId,
      retryable: body.retryable ?? true,
      failureReason: body.failureReason ?? 'Payment failed. Please try again.',
    }
  },
}
```
> **Why `validateStatus`:** `src/services/api.ts`'s response interceptor rejects any non-2xx with
> `new Error(message)`, discarding `error.response`. The orchestrator's 402 body has no `message`
> field, so the interceptor would surface a useless "Request failed with status code 402" and lose
> `orderId`/`retryable`/`failureReason`. Allowing 402 through `validateStatus` routes it to the
> success path so the structured body survives. Network errors and 5xx still throw (retry UX shows
> the generic failure). Do NOT try to parse the 402 out of a thrown error instead — that fights the
> interceptor.

---

## Change 7 — `src/hooks/useCart.ts`: repoint `useCheckout` to the orchestrator

**Old (imports):**
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { cartService } from '@/services/cartService'
import { useCartStore } from '@/stores/cartStore'
import type { AddToCartRequest, UpdateCartItemRequest, CheckoutRequest } from '@/types'
```
**New:**
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { cartService } from '@/services/cartService'
import { orderService } from '@/services/orderService'
import { useCartStore } from '@/stores/cartStore'
import type {
  AddToCartRequest,
  UpdateCartItemRequest,
  OrderCheckoutRequest,
  CheckoutResult,
} from '@/types'
```

**Old (`useCheckout`):**
```ts
export function useCheckout() {
  const queryClient = useQueryClient()
  const clearCart = useCartStore((state) => state.clearCart)

  return useMutation({
    mutationFn: (req: CheckoutRequest) => cartService.checkout(req),
    onSuccess: () => {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```
**New:**
```ts
export function useCheckout() {
  const queryClient = useQueryClient()

  return useMutation<CheckoutResult, Error, OrderCheckoutRequest>({
    mutationFn: (req) => orderService.checkout(req),
    onSuccess: (result) => {
      // The cart is cleared server-side by the order orchestrator only after the
      // order reaches PAID. Do NOT clear optimistically — invalidate so the cart
      // query refetches the authoritative (now-empty) cart. On FAILED the cart is
      // left intact, so nothing is invalidated.
      if (result.status === 'PAID') {
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      }
    },
  })
}
```
> The old code called `clearCart()` optimistically. That is exactly the premature-clear bug Phase D
> removed on the backend — do not reintroduce it on the frontend. Cart clearing is server-owned;
> the frontend only invalidates the query. `CheckoutRequest` is no longer imported here (it moves to
> `OrderCheckoutRequest`); `cartService` is still imported for the other cart hooks — leave it.

---

## Change 8 — `src/pages/CheckoutPage.tsx`: Elements card form (full replacement)

Replace the entire file with:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/config/stripe'
import { useCheckout } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { validateAddress, type AddressErrors } from '@/utils/validateAddress'
import type { Address } from '@/types'

const EMPTY_ADDRESS: Address = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

function CheckoutForm() {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()
  const checkout = useCheckout()
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [cardError, setCardError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const handleChange = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCardError(null)
    setFailure(null)

    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    // PAN/CVC never leave the browser — Stripe.js exchanges the card for a
    // PaymentMethod token; only the token id is sent to the backend.
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })
    if (error || !paymentMethod) {
      setCardError(error?.message ?? 'Card details are invalid.')
      return
    }

    try {
      const result = await checkout.mutateAsync({
        shippingAddress: address,
        paymentMethodId: paymentMethod.id,
      })
      if (result.status === 'PAID') {
        navigate(`/orders/${result.orderId}`)
      } else {
        setFailure(result.failureReason)
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {(Object.keys(EMPTY_ADDRESS) as (keyof Address)[]).map((field) => (
              <div key={field}>
                <Input
                  aria-label={field}
                  placeholder={field}
                  value={address[field]}
                  onChange={handleChange(field)}
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                />
                {errors[field] && (
                  <p id={`${field}-error`} className="mt-1 text-sm text-red-600">
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="mb-1 block text-sm font-medium">Card details</label>
              <div className="rounded-md border border-gray-300 p-3">
                <CardElement options={{ hidePostalCode: true }} />
              </div>
              {cardError && (
                <p id="card-error" className="mt-1 text-sm text-red-600">
                  {cardError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={checkout.isPending}
              disabled={!stripe}
            >
              Place Order
            </Button>

            {failure && (
              <p className="text-center text-sm text-red-600">{failure}</p>
            )}
            {checkout.isError && !failure && (
              <p className="text-center text-sm text-red-600">Checkout failed. Please try again.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutPage() {
  if (!stripePromise) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-red-600">
          Payments are not configured. Set VITE_STRIPE_PUBLISHABLE_KEY to enable checkout.
        </p>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}
```
> `useStripe`/`useElements` must run inside `<Elements>`, hence the `CheckoutForm` split. The address
> inputs, `validateAddress`, and `aria-*` wiring are unchanged from the original so the existing
> address-validation test keeps passing.

---

## Change 9 — `src/pages/CheckoutPage.test.tsx`: rewrite (full replacement)

The old test mocked `cartService.checkout`; the page now uses `orderService.checkout` + Stripe hooks.
Replace the entire file with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import CheckoutPage from './CheckoutPage'
import { orderService } from '@/services/orderService'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const createPaymentMethodMock = vi.fn()
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ createPaymentMethod: createPaymentMethodMock }),
  useElements: () => ({ getElement: () => ({}) }),
}))
vi.mock('@/config/stripe', () => ({ stripePromise: Promise.resolve({}) }))
vi.mock('@/services/orderService', () => ({
  orderService: { checkout: vi.fn() },
}))

function fillAddress() {
  fireEvent.change(screen.getByLabelText('street'), { target: { value: '123 Dev Lane' } })
  fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Cloud City' } })
  fireEvent.change(screen.getByLabelText('state'), { target: { value: 'K8s' } })
  fireEvent.change(screen.getByLabelText('postalCode'), { target: { value: '10101' } })
  fireEvent.change(screen.getByLabelText('country'), { target: { value: 'US' } })
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createPaymentMethodMock.mockResolvedValue({ paymentMethod: { id: 'pm_card_visa' } })
  })

  it('does not submit and shows errors when fields are empty', async () => {
    render(<CheckoutPage />)
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/street is required/i)).toBeInTheDocument()
    expect(orderService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('creates a PaymentMethod, checks out, and navigates to the order on PAID', async () => {
    vi.mocked(orderService.checkout).mockResolvedValue({
      status: 'PAID',
      orderId: 'ord-1',
      amount: '21.00',
      currency: 'USD',
    })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))

    await waitFor(() =>
      expect(orderService.checkout).toHaveBeenCalledWith({
        shippingAddress: {
          street: '123 Dev Lane',
          city: 'Cloud City',
          state: 'K8s',
          postalCode: '10101',
          country: 'US',
        },
        paymentMethodId: 'pm_card_visa',
      })
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/orders/ord-1'))
  })

  it('shows the failure reason and does not navigate when payment is declined', async () => {
    vi.mocked(orderService.checkout).mockResolvedValue({
      status: 'FAILED',
      orderId: 'ord-1',
      retryable: true,
      failureReason: 'Your card was declined.',
    })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/your card was declined/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('surfaces a card error and never calls checkout when card tokenization fails', async () => {
    createPaymentMethodMock.mockResolvedValue({ error: { message: 'Invalid card number.' } })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))

    expect(await screen.findByText(/invalid card number/i)).toBeInTheDocument()
    expect(orderService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
```
> Mocking `@/config/stripe` (resolved promise) + `@stripe/react-stripe-js` (passthrough `Elements`,
> stub `CardElement`, hook stubs) keeps the test hermetic — no real Stripe.js load. `useStripe`
> returning a truthy object means the `disabled={!stripe}` button is enabled. Because `@stripe/stripe-js`
> is only imported by the mocked `config/stripe`, it does not need its own mock.

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` + `package-lock.json` | add `@stripe/stripe-js`, `@stripe/react-stripe-js` |
| `.env.example` | add `VITE_STRIPE_PUBLISHABLE_KEY` |
| `src/config/stripe.ts` | NEW — `loadStripe` singleton, null when key unset |
| `src/config/api.ts` | add `ORDER_CHECKOUT` endpoint |
| `src/types/index.ts` | add `OrderCheckoutRequest` + `CheckoutResult` |
| `src/services/orderService.ts` | add `checkout()` (402-aware via `validateStatus`) |
| `src/hooks/useCart.ts` | repoint `useCheckout` to orchestrator; drop optimistic clear |
| `src/pages/CheckoutPage.tsx` | Elements card form; PAID→navigate, FAILED→retry |
| `src/pages/CheckoutPage.test.tsx` | rewrite for orchestrator + Stripe mocks (4 tests) |

---

## Rules

- `npx tsc --noEmit` → clean (exit 0)
- `npm run lint` → clean (eslint `--max-warnings 0`)
- `npm run build` → succeeds (`tsc -b` + `vite build`)
- `npm test` → all pass (was 24; +2 net = **26**, the four CheckoutPage tests included)
- No files touched outside the table above. Do NOT edit `cartService.ts` (its `checkout` stays,
  unused by this flow but harmless), the axios instance, or any other page/hook.

---

## Definition of Done

- [ ] Empty address → field errors, no tokenization, no checkout call
- [ ] Card tokenization failure → Stripe error shown, no checkout call
- [ ] PAID → navigate `/orders/{orderId}`; cart + orders queries invalidated
- [ ] Declined (402) → `failureReason` shown, no navigate, cart intact
- [ ] `tsc`, `lint`, `build`, and `test` all pass
- [ ] Committed and pushed to `feat/stripe-checkout-elements`
- [ ] memory-bank updated with commit SHA and task status

**Commit message (exact):**
```
feat(checkout): Stripe Elements card checkout via order orchestrator
```

---

## What NOT to Do

- Do NOT create a PR.
- Do NOT skip pre-commit hooks (`--no-verify`).
- Do NOT call the payment service directly, and do NOT send `amount`/`currency`/`customerId` — the
  frontend sends only `{ shippingAddress, paymentMethodId }` to `/api/orders/checkout`.
- Do NOT put a Stripe **secret** key (`sk_…`) in any `VITE_*` variable or the bundle.
- Do NOT read raw card fields into React state — Stripe Elements holds the card; only the
  PaymentMethod id leaves the browser.
- Do NOT clear the cart optimistically on the client — the orchestrator clears it after PAID.
- Do NOT mark an order paid from the client — render whatever `paymentStatus` the orchestrator returns.
- Do NOT branch off a phase branch — this is off `main`.
- Do NOT commit to `main`.
```
