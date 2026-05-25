# Changelog

## [Unreleased]

### Added
- nginx proxy block (`location ^~ /minio/`) to route browser image requests to MinIO without hardcoded node IPs
- Wire `q` search param through `productService.ts` to `GET /api/products?q=<term>` for full-text search

### Changed
- Upgrade Node.js 20 → 22 in CI workflow (all 6 setup-node steps) and Dockerfile build stage

### Fixed
- `src/services/cartService.ts` — unwrap basket-service response envelope in all cart methods by returning `response.data.data` instead of `response.data`; fixes "Failed to add to cart" error where `cart.items.reduce()` threw TypeError because `cart` was the wrapper object `{ success, data }`, not the `Cart` type; adds `Wrapped<T>` type alias for compile-time safety
- `src/services/productService.ts` — fix `pageSize` → `page_size` query param so `GET /api/products?page_size=<n>` returns all product categories (prior hardcoded `pageSize` mismatched backend snake_case, causing only laptops to be returned from the seeding order)
- `src/services/productService.ts` — fix `getProductById` field mapping to recast backend response `{quantity → stock, image_url → imageUrl, created_at → createdAt, updated_at → updatedAt}` so product detail correctly shows stock status and images
- `nginx.conf` — fix `proxy_pass` for `/api/cart` to rewrite to `http://basket-service.shopping-cart-apps.svc.cluster.local:8083/api/v1/cart` (backend Gin group routes are under `/api/v1`; missing the version prefix caused all add-to-cart requests to 404)
- `e2e/cart.spec.ts`, `e2e/orders.spec.ts`, `e2e/products.spec.ts`: resolve OIDC `localStorage` key to match `VITE_KEYCLOAK_URL` — hardcoded `http://localhost:8080` prefix caused all authenticated Playwright tests to fail in CI when `VITE_KEYCLOAK_URL=https://keycloak.3ai-talk.org`
- `src/services/productService.ts`: map backend `{items, total, page_size, pages, image_url, quantity}` response to frontend `PaginatedResponse<Product>` type
- `src/services/orderService.ts`: add `customerId` to query params; wrap plain `Order[]` response in `PaginatedResponse` shape
- `src/hooks/useOrders.ts`: extract Keycloak `sub` as `customerId`; gate query on `!!customerId` — eliminates 400 Bad Request on order fetch before auth
- `.github/workflows/ci.yml` — pass `VITE_KEYCLOAK_URL=http://keycloak.shopping-cart.local` as `build-args` to reusable workflow so the Keycloak URL is baked into the image at build time; update SHA pin to `8c581840` (the infra commit that added `build-args` support)
- `nginx.conf` — replace `http://keycloak.identity.svc.cluster.local:8080` with `http://keycloak.shopping-cart.local` in CSP `connect-src` so browser OIDC requests to Keycloak are not blocked
- Add `nginx-cache` emptyDir volume at `/var/cache/nginx` so nginx (uid 101) can create cache subdirectories at startup; remove erroneous `conf.d` emptyDir that was hiding the packaged nginx config; restore containerPort/probes/targetPort to 8080 + `/health` (consistent with nginx.conf)

## [0.1.1] - 2026-03-21

### Fixed
- Run nginx as non-root (UID 101) on port 8080; fix `CrashLoopBackOff` caused by permission denied on `/var/cache/nginx` and inability to bind port 80 without `CAP_NET_BIND_SERVICE`

### Changed
- Reduce deployment replicas from 2 to 1 for dev/test environment; HPAs not applicable on single-node cluster (will reintroduce in v1.1.0 EKS)

## [0.1.0] - 2026-03-14

### Added
- React 18 + TypeScript + Vite single-page application
- Pages: Home, Products, ProductDetail, Cart, Orders, Login, LoginCallback
- Keycloak OIDC integration (react-keycloak-web)
- Zustand cart store
- React Query for data fetching
- Vitest + React Testing Library unit tests
- Dockerfile (multi-stage, nginx)
- Kubernetes manifests (Deployment, Service, ConfigMap)
- GitHub Actions CI: ESLint + TypeScript check + Vitest + Trivy + ghcr.io push
- Branch protection (1 required review + CI status check)
