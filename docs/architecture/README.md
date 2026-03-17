# Frontend — Architecture

## Overview

The frontend is a React 18 / TypeScript / Vite single-page application. It authenticates users via Keycloak OIDC and communicates with three backend services through an API Gateway.

## Component Diagram

```mermaid
graph TD
    U[User / Browser] --> FE

    subgraph FE[Frontend — React + Vite]
        Pages --> Components
        Pages --> Hooks
        Hooks --> Services[API Services / Axios]
        Hooks --> Stores[Zustand State]
        Pages --> Auth[Auth / react-oidc-context]
    end

    Auth --> KC[Keycloak OIDC]
    Services --> GW[Frontend nginx / Ingress]

    subgraph Backend[Backend Services]
        GW --> OS[Order Service]
        GW --> PC[Product Catalog]
        GW --> BS[Basket Service]
    end
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant KC as Keycloak
    participant API as Backend API

    U->>FE: Click Login
    FE->>KC: Redirect to login page
    KC-->>U: Login form
    U->>KC: Submit credentials
    KC-->>FE: Redirect with authorization code (PKCE)
    FE->>KC: Exchange code for tokens
    KC-->>FE: Access + ID tokens
    U->>FE: Access protected route
    FE->>API: Request + Authorization: Bearer <token>
    API-->>FE: Authorized response
```

## Layer Responsibilities

| Layer | Libraries | Purpose |
|-------|-----------|---------|
| Pages | React Router 6 | Route-level components |
| Components | React 18 | Reusable UI elements |
| Hooks | TanStack Query, Zustand | Server and client state |
| Services | Axios | HTTP clients per backend service |
| Auth | oidc-client-ts, react-oidc-context | OIDC token lifecycle |

## Protected Routes

| Route | Auth Required |
|-------|---------------|
| `/cart` | Yes |
| `/orders` | Yes |
| `/orders/:id` | Yes |
| `/` `/products` | No |

## Deployment

- Packaged as a static build via `npm run build`
- Served by Nginx in a multi-stage Docker image
- Kubernetes manifests in `k8s/base/` (Kustomize)
