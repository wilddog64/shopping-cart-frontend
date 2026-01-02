# Shopping Cart Frontend

A modern React-based frontend for the Shopping Cart platform, featuring OAuth2/OIDC authentication with Keycloak, product browsing, cart management, and order tracking.

## Technology Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.x |
| Framework | React 18 |
| Build Tool | Vite 5.x |
| Routing | React Router 6 |
| Server State | TanStack Query (React Query) |
| Client State | Zustand |
| API Client | Axios |
| Auth | oidc-client-ts + react-oidc-context |
| Styling | Tailwind CSS 3.x |
| Testing | Vitest + React Testing Library |
| E2E Testing | Playwright |

## Features

- **Product Catalog**: Browse and search products
- **Shopping Cart**: Add, update, remove items with real-time totals
- **Order Management**: View order history and details
- **Authentication**: OAuth2/OIDC with Keycloak SSO
- **Responsive Design**: Mobile-first UI
- **Type Safety**: Full TypeScript coverage

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Keycloak server (for authentication)
- Backend services running (Order, Product Catalog, Basket)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=shopping-cart
VITE_CLIENT_ID=frontend
VITE_ORDER_SERVICE_URL=/api/orders
VITE_PRODUCT_SERVICE_URL=/api/products
VITE_CART_SERVICE_URL=/api/cart
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Header, Footer, etc.)
│   └── ui/              # Reusable UI components (Button, Card, etc.)
├── config/              # Configuration (auth, API endpoints)
├── features/            # Feature-specific components
├── hooks/               # Custom React hooks (useProducts, useCart, etc.)
├── pages/               # Route page components
├── services/            # API service layer
├── stores/              # Zustand state stores
├── test/                # Test utilities
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## API Endpoints

The frontend communicates with three backend services:

| Service | Endpoint Prefix | Description |
|---------|-----------------|-------------|
| Order Service | `/api/orders` | Order management |
| Product Catalog | `/api/products` | Product listing and details |
| Basket Service | `/api/cart` | Shopping cart operations |

## Authentication

Authentication is handled via Keycloak OAuth2/OIDC:

1. User clicks "Login" button
2. Redirected to Keycloak login page
3. After successful login, redirected back with tokens
4. JWT tokens are stored in localStorage
5. Axios interceptor adds Bearer token to API requests

### Protected Routes

The following routes require authentication:
- `/cart` - Shopping cart
- `/orders` - Order history
- `/orders/:id` - Order details

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/ui/Button.test.tsx

# Watch mode
npm run test:watch
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time)
npm run playwright:install

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Run All Tests

```bash
# Using Makefile
make test-all

# Or manually
npm test && npm run test:e2e
```

### E2E Test Coverage

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `home.spec.ts` | 5 | Home page, hero, features, navigation |
| `products.spec.ts` | 10 | Product listing, search, detail page |
| `cart.spec.ts` | 8 | Cart operations, checkout, empty state |
| `orders.spec.ts` | 9 | Orders list, detail, cancel, empty state |
| `navigation.spec.ts` | 10 | Routing, 404, responsive, accessibility |

## Docker

```bash
# Build image
make docker-build

# Run container
make docker-run

# Or manually
docker build -t shopping-cart/frontend:latest .
docker run -p 3000:80 shopping-cart/frontend:latest
```

## Kubernetes Deployment

```bash
# Preview manifests
kubectl kustomize k8s/base

# Apply to cluster
kubectl apply -k k8s/base
```

## Development

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create API service if needed in `src/services/`
4. Add React Query hook in `src/hooks/`
5. Write tests

### Adding a New UI Component

1. Create component in `src/components/ui/`
2. Export from component file
3. Write tests in same directory

### State Management

- **Server State**: Use TanStack Query for data fetching/caching
- **Client State**: Use Zustand for UI state (cart count, etc.)
- **Form State**: Use local component state or React Hook Form

## Keycloak Client Configuration

Register a new client in Keycloak:

1. Go to Keycloak Admin Console
2. Select `shopping-cart` realm
3. Clients → Create client
4. Client ID: `frontend`
5. Client type: `public`
6. Valid redirect URIs: `http://localhost:3000/*`
7. Web origins: `http://localhost:3000`

## Related Documentation

- [Shopping Cart Platform](../shopping-cart/README.md)
- [Order Service](../shopping-cart-order/README.md)
- [Product Catalog](../shopping-cart-product-catalog/README.md)
- [Basket Service](../shopping-cart-basket/README.md)
- [Infrastructure](../shopping-cart-infra/README.md)

## License

MIT
