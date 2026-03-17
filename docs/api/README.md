# API Reference — Shopping Cart Frontend

The frontend communicates with three backend services through Istio ingress. All requests
use the Bearer token from Keycloak.

## Backend Services

| Service | Env var | Default prefix |
|---|---|---|
| Order Service | `VITE_ORDER_SERVICE_URL` | `/api/orders` |
| Product Catalog | `VITE_PRODUCT_SERVICE_URL` | `/api/products` |
| Basket Service | `VITE_CART_SERVICE_URL` | `/api/cart` |

## Order Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders` | List orders for authenticated user |
| `GET` | `/api/orders/:id` | Get order details |
| `POST` | `/api/orders` | Create order from current basket |
| `PUT` | `/api/orders/:id/cancel` | Cancel an order |

## Product Catalog

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List products (supports `?search=`, `?page=`, `?size=`) |
| `GET` | `/api/products/:id` | Get product details |

## Basket Service

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cart` | Get current basket |
| `POST` | `/api/cart/items` | Add item to basket |
| `PUT` | `/api/cart/items/:id` | Update item quantity |
| `DELETE` | `/api/cart/items/:id` | Remove item from basket |
| `DELETE` | `/api/cart` | Clear basket |

## Auth Headers

All requests include:
```
Authorization: Bearer <keycloak-access-token>
```

Injected automatically by the Axios interceptor in `src/config/`.

## Error Handling

- `401` — token expired; Keycloak refresh attempted automatically
- `403` — insufficient permissions; error page shown
- `5xx` — toast notification shown; TanStack Query retries up to 3 times
