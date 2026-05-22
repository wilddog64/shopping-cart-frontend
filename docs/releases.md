# Release History

## All Releases

| Version | Release Date | Highlights |
|---------|--------------|-----------|
| [v0.1.2](https://github.com/wilddog64/shopping-cart-frontend/releases/tag/v0.1.2) | 2026-05-22 | Keycloak URL in CI build-args; nginx CSP policy fix; API response field mapping; customerId from Keycloak tokens |
| [v0.1.1](https://github.com/wilddog64/shopping-cart-frontend/releases/tag/v0.1.1) | 2026-03-21 | Run nginx as non-root (UID 101) on port 8080; fix CrashLoopBackOff; reduce replicas to 1 for dev/test |
| [v0.1.0](https://github.com/wilddog64/shopping-cart-frontend/releases/tag/v0.1.0) | 2026-03-14 | Initial React 18 + TypeScript + Vite SPA; Keycloak OIDC; shopping cart + order management; Vitest + RTL; nginx Dockerfile; k8s manifests; GitHub Actions CI |

## Version Numbering

This project follows **Semantic Versioning** (MAJOR.MINOR.PATCH):
- **PATCH** — bug fixes, security updates, dependency patches
- **MINOR** — new features, breaking changes (while < v1.0.0)
- **MAJOR** — stable API milestone or breaking architectural changes

---

## Planned Releases (Roadmap)

- **v0.2.0** — TypeScript strictness + advanced cart features (inventory sync, wishlist)
- **v0.3.0** — E2E test suite complete + lighthouse performance targets
- **v1.0.0** — Stable UI/API, production-ready on multi-cluster, full accessibility (WCAG 2.1)
