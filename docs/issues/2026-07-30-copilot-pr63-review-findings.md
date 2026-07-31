# Copilot PR #63 review findings — checkout contract alignment

**PR:** #63 (`fix/checkout-contract-alignment`)
**Fix commit:** `ffe1447`

Copilot raised two findings; both were valid and fixed.

## Finding 1 — `src/pages/CheckoutPage.tsx` (accessibility)

Per-field validation errors were shown, but the `<Input>` elements were not marked invalid
or linked to their error text, so assistive tech could not associate the two.

**Before:**
```tsx
<Input aria-label={field} placeholder={field} value={address[field]} onChange={handleChange(field)} />
{errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
```

**After:**
```tsx
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
```

## Finding 2 — `src/pages/CheckoutPage.test.tsx` (type safety)

`mockResolvedValue({} as never)` defeated type checking. Replaced with a typed minimal `Cart`
fixture so the mock matches the real `cartService.checkout` return type.

**Before:** `vi.mocked(cartService.checkout).mockResolvedValue({} as never)`
**After:** a module-level `EMPTY_CART: Cart` fixture passed to `mockResolvedValue`.

## Root cause / process note

Both are quality nits, not defects in the fix's behavior. Process improvement folded into the
spec template: **the gate list must include `prettier --check` and prefer typed test fixtures
over `as never` casts** — the original spec listed only `npm run lint` (eslint), which let a
prettier-format failure reach CI (fixed in `3ade462`).
