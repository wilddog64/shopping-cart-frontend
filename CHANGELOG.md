# Changelog

## [Unreleased]

### Added
- Stripe Elements card checkout via the order orchestrator (Stripe checkout Phase E): a new `src/config/stripe.ts` loads Stripe.js from `VITE_STRIPE_PUBLISHABLE_KEY`, and the checkout page collects card details through Stripe Elements, tokenizes them client-side into a PaymentMethod (`pm_…`), and submits the order through the order orchestrator — raw card data never reaches any backend. When the publishable key is unset, `stripePromise` is `null` and Elements is disabled (no build break). Spec: `docs/plans/` Phase E Stripe Elements checkout via orchestrator.
- `.github/workflows/dependabot-automerge.yml`: auto-merge Dependabot minor/patch version updates and all security updates (any semver, via `alert-lookup`) with `gh pr merge --auto --squash` once required CI checks pass; **non-security** major bumps stay open for review (`dependabot/fetch-metadata` pinned to v2.3.0; `pull_request_target` scoped to `main`, job-level least-privilege permissions, gated on the PR author, no PR-head checkout)
- `.github/dependabot.yml`: Dependabot scheduled version updates for npm packages, Docker base images, and GitHub Actions (weekly; minor/patch grouped, majors separate). Repository-level Dependabot security updates (immediate advisory-triggered PRs) are enabled separately as a repo setting — together they close the first-mile CVE gap so a flagged app dependency opens an update PR that CI builds into a clean image
- `.githooks/pre-push`: pre-push hook to block accidental direct pushes from feature branches to main; bypass with `ALLOW_MAIN_PUSH=1`
- `Dockerfile` / `.github/workflows/ci.yml`: wire `VITE_STRIPE_PUBLISHABLE_KEY` into the image build so Stripe Elements is enabled in the published frontend. Added the build `ARG` and passed it in both CI build-args blocks (build + publish jobs) from the `VITE_STRIPE_PUBLISHABLE_KEY` repository variable — the publishable key (`pk_test_…`) is client-visible by design, so it is a `vars.` value, not a secret. When unset, the build-arg is empty and the frontend falls back to Elements-disabled (no build break).

### Changed
- Upgrade Node.js 20 → 22 in CI workflow (all 6 setup-node steps) and Dockerfile build stage
- `.gitignore` — ignore `vite.config.js` so the `tsc -b` build artifact (a transpiled copy of `vite.config.ts`) is never committed; a stale tracked copy would shadow the `.ts` config since Vite resolves `.js` first.
- `k8s/base/deployment.yaml`: add explicit `strategy: RollingUpdate` with `maxSurge: 0` / `maxUnavailable: 1` so rollouts complete on the single-node hostinger cluster instead of wedging with an unschedulable surge pod (previously relied on the Kubernetes default surge)

### Fixed
- `.github/workflows/ci.yml` (deploy step): the `publish` job no longer pushes the manifest bump directly to protected `main` (which failed with GH006). It now commits the `k8s/base/kustomization.yaml` image-tag bump to a `ci/frontend-image-sha-<sha>` branch, opens a PR authenticated with the existing shared `PACKAGES_TOKEN`, and enables auto-merge (`--squash --delete-branch`) so it lands once required checks pass. Adds `pull-requests: write` to the job and a loop guard (`!startsWith(github.event.head_commit.message, 'ci(deploy):')`) so the resulting deploy commit does not re-trigger the pipeline. `PACKAGES_TOKEN` already exists in this repo (used across the backend repos for manifest-bump git pushes) so no new secret is needed; it does not bypass branch protection — the deploy PR still passes all required checks before auto-merge. Specs: `docs/plans/frontend-deploy-gh006-pr-flow.md`, `docs/plans/frontend-deploy-reuse-packages-token.md`.
- Checkout contract alignment with the basket service: checkout now collects and validates a shipping address (`street/city/state/postalCode/country`) on a new protected `/checkout` page and sends it as `{ shippingAddress }`, fixing the HTTP 400 the basket returned for the previous empty-body POST. Basket checkout is asynchronous (returns `{ message, cart }`, no `orderId`), so on success the app navigates to the orders list (`/orders`) instead of `/orders/${orderId}` — removing the `/orders/undefined` dead-end. Frontend-only; no backend change. Spec: `docs/plans/checkout-contract-alignment.md`.
- `vite.config.ts` — add `rewrite` to the `/api/cart` dev proxy so `vite dev` rewrites `/api/cart` → `/api/v1/cart`, matching basket-service's Gin `/api/v1` group and the production `nginx.conf` proxy_pass. Previously the dev proxy forwarded `/api/cart` verbatim → basket 404, so the cart page failed only under `vite dev` (production via nginx was already correct). The rewrite anchors on a segment boundary (`/`, `?`, or end) so sibling paths like `/api/cartoon` are not rewritten.

## [0.1.2] - 2026-05-25

### Added
- nginx proxy block (`location ^~ /minio/`) to route browser image requests to MinIO without hardcoded node IPs
- Wire `q` search param through `productService.ts` to `GET /api/products?q=<term>` for full-text search

### Fixed
- `src/services/cartService.ts` — unwrap basket-service response envelope in cart/checkout methods (`getCart`, `addItem`, `updateItem`, `removeItem`, `checkout`) by returning `response.data.data` instead of `response.data`; `clearCart` unchanged (204 No Content); fixes "Failed to add to cart" error where `cart.items.reduce()` threw TypeError because `cart` was the wrapper object `{ success, data }`, not the `Cart` type; adds `Wrapped<T>` type alias for compile-time safety
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
