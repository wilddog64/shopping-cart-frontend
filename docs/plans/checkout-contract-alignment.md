# Fix: align frontend checkout with basket contract (shipping address + async success)

**Repo:** `shopping-cart-frontend`
**Branch (create from origin/main):** `fix/checkout-contract-alignment`
**Issue:** `docs/issues/2026-05-27-frontend-checkout-contract-mismatch.md` (and
`k3d-manager/docs/issues/2026-07-30-frontend-checkout-contract-mismatch.md`)

---

## Problem

`POST /api/cart/checkout` returns **400** because the frontend sends an empty body, while the
basket service requires a fully-populated `shippingAddress` (all of `street/city/state/
postalCode/country`, each `binding:"required"`). Separately, the frontend expects an `orderId`
in the response and navigates to `/orders/${orderId}`, but basket returns
`{ message, cart }` and creates the order **asynchronously** (publishes an event) — so no
`orderId` exists at response time, and the current code routes to `/orders/undefined`.

**Decision (locked):** async-aware **frontend-only** fix. Collect + validate the address, send
`{ shippingAddress }`, and on success navigate to `/orders` (the list) — NOT `/orders/:id`.
Do **not** change the basket or order services.

---

## Before You Start

- `git checkout -b fix/checkout-contract-alignment origin/main` (never work on `main`).
- Read these files first: `src/services/cartService.ts`, `src/hooks/useCart.ts`,
  `src/pages/CartPage.tsx`, `src/App.tsx`, `src/types/index.ts`, `src/components/ui/Input.tsx`,
  `src/components/ui/Button.tsx`, `src/test/test-utils.tsx`.
- The `Address` interface already exists in `src/types/index.ts` — reuse it, do not redefine it.

---

## Changes

### Change 1 — `src/types/index.ts`: add a `CheckoutRequest` type

Add immediately AFTER the existing `Address` interface (currently lines 83–90):

```ts
export interface CheckoutRequest {
  shippingAddress: Address
}
```

### Change 2 — `src/services/cartService.ts`: send the address, return the cart

**Exact old block (lines 32–35):**

```ts
  async checkout(): Promise<{ orderId: string }> {
    const response = await api.post<Wrapped<{ orderId: string }>>(ENDPOINTS.CART_CHECKOUT)
    return response.data.data
  },
```

**Exact new block:**

```ts
  async checkout(req: CheckoutRequest): Promise<Cart> {
    const response = await api.post<Wrapped<{ message: string; cart: Cart }>>(
      ENDPOINTS.CART_CHECKOUT,
      req
    )
    return response.data.data.cart
  },
```

Also update the import on line 3 to include `CheckoutRequest`:

**Exact old block (line 3):**

```ts
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from '@/types'
```

**Exact new block:**

```ts
import type { Cart, AddToCartRequest, UpdateCartItemRequest, CheckoutRequest } from '@/types'
```

### Change 3 — `src/hooks/useCart.ts`: pass the request through

**Exact old block (lines 75–87):**

```ts
export function useCheckout() {
  const queryClient = useQueryClient()
  const clearCart = useCartStore((state) => state.clearCart)

  return useMutation({
    mutationFn: () => cartService.checkout(),
    onSuccess: () => {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

**Exact new block:**

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

Update the type import on line 5:

**Exact old block (line 5):**

```ts
import type { AddToCartRequest, UpdateCartItemRequest } from '@/types'
```

**Exact new block:**

```ts
import type { AddToCartRequest, UpdateCartItemRequest, CheckoutRequest } from '@/types'
```

### Change 4 — NEW `src/utils/validateAddress.ts` (pure, unit-tested)

```ts
import type { Address } from '@/types'

export type AddressErrors = Partial<Record<keyof Address, string>>

const FIELD_LABELS: Record<keyof Address, string> = {
  street: 'Street',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
  country: 'Country',
}

export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {}
  ;(Object.keys(FIELD_LABELS) as (keyof Address)[]).forEach((field) => {
    if (!address[field] || address[field].trim() === '') {
      errors[field] = `${FIELD_LABELS[field]} is required`
    }
  })
  return errors
}

export function isAddressValid(address: Address): boolean {
  return Object.keys(validateAddress(address)).length === 0
}
```

### Change 5 — NEW `src/pages/CheckoutPage.tsx` (shipping-address form)

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function CheckoutPage() {
  const navigate = useNavigate()
  const checkout = useCheckout()
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})

  const handleChange = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await checkout.mutateAsync({ shippingAddress: address })
      navigate('/orders')
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
                />
                {errors[field] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" size="lg" loading={checkout.isPending}>
              Place Order
            </Button>
            {checkout.isError && (
              <p className="text-center text-sm text-red-600">
                Checkout failed. Please try again.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

> If `Input` is not a named export, match the actual export style used by
> `src/components/ui/Input.tsx` (check before writing). Do not change `Input.tsx`.

### Change 6 — `src/App.tsx`: add the protected `/checkout` route

Add the import alongside the other page imports (after the `CartPage` import, line 7):

```tsx
import CheckoutPage from './pages/CheckoutPage'
```

Add this `<Route>` immediately AFTER the existing `cart` route block (after line 40, before the
`orders` route):

```tsx
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
```

### Change 7 — `src/pages/CartPage.tsx`: navigate to the checkout page (drop the buggy call)

**Exact old block (lines 15–22):**

```tsx
  const handleCheckout = async () => {
    try {
      const result = await checkout.mutateAsync()
      navigate(`/orders/${result.orderId}`)
    } catch (err) {
      console.error('Checkout failed:', err)
    }
  }
```

**Exact new block:**

```tsx
  const handleCheckout = () => {
    navigate('/checkout')
  }
```

Then remove the now-unused checkout mutation wiring in this file:

- Delete `useCheckout` from the import on line 3 → it becomes
  `import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart'`
- Delete line 13 `const checkout = useCheckout()`
- On the "Proceed to Checkout" `<Button>` (lines 87–94), remove `loading={checkout.isPending}`
  (keep `onClick={handleCheckout}`).
- Delete the `{checkout.isError && (…)}` block (lines 95–99) — errors now surface on the
  checkout page.

---

## Tests (required)

### `src/utils/validateAddress.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { validateAddress, isAddressValid } from './validateAddress'
import type { Address } from '@/types'

const VALID: Address = {
  street: '123 Dev Lane',
  city: 'Cloud City',
  state: 'K8s',
  postalCode: '10101',
  country: 'US',
}

describe('validateAddress', () => {
  it('returns no errors for a fully populated address', () => {
    expect(validateAddress(VALID)).toEqual({})
    expect(isAddressValid(VALID)).toBe(true)
  })

  it('flags every empty field', () => {
    const errors = validateAddress({
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    })
    expect(Object.keys(errors).sort()).toEqual(
      ['city', 'country', 'postalCode', 'state', 'street'].sort()
    )
    expect(isAddressValid({ ...VALID, city: '   ' })).toBe(false)
  })
})
```

### `src/pages/CheckoutPage.test.tsx`

Mock `cartService` and `react-router-dom`'s `useNavigate`. Cover:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import CheckoutPage from './CheckoutPage'
import { cartService } from '@/services/cartService'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('@/services/cartService', () => ({
  cartService: { checkout: vi.fn() },
}))

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not submit and shows errors when fields are empty', async () => {
    render(<CheckoutPage />)
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/street is required/i)).toBeInTheDocument()
    expect(cartService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('sends the shipping address and navigates to /orders on success', async () => {
    vi.mocked(cartService.checkout).mockResolvedValue({} as never)
    render(<CheckoutPage />)
    fireEvent.change(screen.getByLabelText('street'), { target: { value: '123 Dev Lane' } })
    fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Cloud City' } })
    fireEvent.change(screen.getByLabelText('state'), { target: { value: 'K8s' } })
    fireEvent.change(screen.getByLabelText('postalCode'), { target: { value: '10101' } })
    fireEvent.change(screen.getByLabelText('country'), { target: { value: 'US' } })
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    await waitFor(() =>
      expect(cartService.checkout).toHaveBeenCalledWith({
        shippingAddress: {
          street: '123 Dev Lane',
          city: 'Cloud City',
          state: 'K8s',
          postalCode: '10101',
          country: 'US',
        },
      })
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/orders'))
  })
})
```

> If `getByLabelText` does not resolve against the `aria-label` values, adjust the queries to
> match the actual rendered labels — the assertion on the `checkout` payload is the part that
> must not change.

---

## Rules

- `npm run lint` — zero warnings (config runs `--max-warnings 0`).
- `npm run build` — `tsc -b` must pass (no type errors; the `checkout(req)` signature change
  must be reflected at every call site).
- `npm run test` — all vitest suites pass, including the two new files.
- Do NOT add any new npm dependency (no toast/form libraries — none exist today).
- Do NOT modify `src/components/ui/*`, the basket service, or the order service.
- Do NOT touch files outside the list in "Files Changed".

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `CheckoutRequest` interface |
| `src/services/cartService.ts` | `checkout(req)` sends `{ shippingAddress }`, returns `Cart` |
| `src/hooks/useCart.ts` | `useCheckout` takes `CheckoutRequest` |
| `src/utils/validateAddress.ts` | NEW — pure address validation |
| `src/pages/CheckoutPage.tsx` | NEW — shipping-address form |
| `src/App.tsx` | Add protected `/checkout` route |
| `src/pages/CartPage.tsx` | Button navigates to `/checkout`; remove buggy `orderId` nav |
| `src/utils/validateAddress.test.ts` | NEW — unit test |
| `src/pages/CheckoutPage.test.tsx` | NEW — component test |

---

## Definition of Done

- [ ] `npm run lint`, `npm run build`, `npm run test` all pass.
- [ ] Checkout collects + validates all five address fields; empty submit blocks and shows errors.
- [ ] On success the app navigates to `/orders` (not `/orders/:id` / `/orders/undefined`).
- [ ] The checkout POST body is `{ shippingAddress: {street,city,state,postalCode,country} }`.
- [ ] No backend change; no new dependency.
- [ ] Committed and pushed to `fix/checkout-contract-alignment`.

**Commit message (exact):**
```
fix(checkout): send shipping address and handle async checkout response
```

---

## What NOT to Do

- Do NOT create a PR.
- Do NOT skip pre-commit hooks (`--no-verify`).
- Do NOT modify any file outside the "Files Changed" table.
- Do NOT change the basket or order services (async contract stays as-is).
- Do NOT commit to `main` — work on `fix/checkout-contract-alignment`.
