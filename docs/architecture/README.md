# Architecture — Shopping Cart Frontend

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| Framework | React 18 |
| Build | Vite 5.x |
| Routing | React Router 6 |
| Server state | TanStack Query |
| Client state | Zustand |
| HTTP | Axios |
| Auth | oidc-client-ts + react-oidc-context |
| Styling | Tailwind CSS 3.x |
| Unit tests | Vitest + React Testing Library |
| E2E tests | Playwright |

## Source Layout

```
src/
├── components/
│   ├── layout/      # Header, Footer, page shell
│   └── ui/          # Reusable primitives (Button, Card, ...)
├── config/          # Auth config, API base URLs
├── features/        # Feature-scoped components (ProductList, CartDrawer, ...)
├── hooks/           # TanStack Query wrappers (useProducts, useCart, ...)
├── pages/           # Route-level components (HomePage, CartPage, ...)
├── services/        # Axios API clients per backend service
├── stores/          # Zustand stores (cartStore, ...)
├── test/            # Test utilities and mocks
├── types/           # Shared TypeScript types
└── utils/           # Pure utility functions
```

## Authentication Flow

```
User → Login button
     → Keycloak login page (redirect)
     → Token issued (access + refresh)
     → Stored in localStorage
     → Axios interceptor injects Bearer token on every request
```

Protected routes (`/cart`, `/orders`, `/orders/:id`) redirect to Keycloak if unauthenticated.

Keycloak client config:
- Realm: `shopping-cart`
- Client ID: `frontend`
- Client type: `public`

## State Management

| State type | Tool | Example |
|---|---|---|
| Server/async | TanStack Query | product list, order history |
| Client/UI | Zustand | cart item count, auth state |
| Form | Local component state | checkout form |

## Container

Nginx serves the production build on port 80. `nginx.conf` proxies `/api/*` to backend services
via Istio VirtualService. Built as a multi-stage Docker image — Node 20 builder → Nginx Alpine runtime.

## Kubernetes

Manifests in `k8s/base/` (Kustomize). Managed by ArgoCD on the Ubuntu k3s app cluster.
Image tag updated by the CI infra workflow on every push to `main`.
