# Changelog

## [Unreleased]

### Fixed
- `e2e/cart.spec.ts`, `e2e/orders.spec.ts`, `e2e/products.spec.ts`: resolve OIDC `localStorage` key to match `VITE_KEYCLOAK_URL` — hardcoded `http://localhost:8080` prefix caused all authenticated Playwright tests to fail in CI when `VITE_KEYCLOAK_URL=https://keycloak.3ai-talk.org`

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
