# Changelog

## [Unreleased]

### Fixed
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
