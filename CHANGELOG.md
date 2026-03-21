# Changelog

## [Unreleased]

### Fixed
- Correct nginx container port 8080→80; fix readiness/liveness probe path `/health`→`/` and port 8080→80; add emptyDir volume at `/etc/nginx/conf.d` to allow non-root nginx to write config on startup; fix service `targetPort` 8080→80

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
