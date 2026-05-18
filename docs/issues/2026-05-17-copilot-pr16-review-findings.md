# Copilot PR #16 Review Findings — Frontend API Contract Fix

**PR:** #16 — `fix(frontend): map backend API fields and pass customerId from Keycloak`
**Branch:** `fix/frontend-api-contract`
**Date:** 2026-05-17

---

## Finding 1 — productService: `Number(p.price)` produces NaN when null

**File:** `src/services/productService.ts` line 36  
**Copilot:** Field coercions can produce invalid values (`Number(p.price)` → NaN when missing/null).

**Fix applied (commit `08c0458`):**
```typescript
// Before
price: Number(p.price),

// After
price: Number(p.price ?? 0),
```

**Root cause:** Spec used unconditional `Number()` for price but numeric fields can be null/undefined in edge cases. Other numeric fields (`stock`) already had `?? 0` defaults.

**Process note:** All `Number()` coercions in backend→frontend mappers must include `?? 0` fallback. Add to spec template mapper section.

---

## Finding 2 — productService: hard-cast to snake_case shape (informational)

**File:** `src/services/productService.ts` line 44  
**Copilot:** If endpoint returns PaginatedResponse shape `{data, pageSize}`, `raw.items` will be undefined.

**Resolution:** No code change. The product-catalog FastAPI backend returns `{items, total, page_size, pages}` (confirmed via live cluster investigation 2026-05-17). The cast is correct for the actual backend contract. Copilot lacks context about the backend response shape.

---

## Finding 3 — orderService: assumes plain `Order[]` (informational)

**File:** `src/services/orderService.ts` line 29  
**Copilot:** Existing mocks/tests return PaginatedResponse shape which would result in `[]`.

**Resolution:** No code change. The order-service Spring backend returns `List<OrderResponse>` (plain JSON array) confirmed from `OrderController.java`. `Array.isArray()` guard handles both shapes safely — if tests use PaginatedResponse mocks, items falls back to `[]` which is the correct empty state. Tests using PaginatedResponse mocks are testing a non-existent backend contract and should be updated separately.
