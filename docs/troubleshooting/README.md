# Troubleshooting — Shopping Cart Frontend

## Local Dev

### Blank page / OIDC redirect loop

**Cause:** Keycloak not running or `VITE_KEYCLOAK_URL` incorrect.

**Fix:**
1. Confirm Keycloak is running: `kubectl get pods -n identity`
2. Check `.env.local` has the correct `VITE_KEYCLOAK_URL`
3. Confirm the `frontend` client exists in the `shopping-cart` realm with the correct redirect URI

---

### `npm run dev` fails with `EADDRINUSE`

Port 3000 already in use.

```bash
lsof -i :3000 | grep LISTEN
kill -9 <pid>
```

---

### TypeScript errors after `git pull`

New types added — regenerate:

```bash
npm install
npx tsc --noEmit
```

---

### E2E tests fail locally (`npx playwright install` not run)

```bash
npm run playwright:install
npm run test:e2e
```

---

## CI

### `npm audit` reports vulnerabilities (Security Scan job)

Security Scan has `continue-on-error: true` — it will not block the build. Review the
audit output in the job logs and open an issue for any high/critical findings.

### E2E job fails in CI but passes locally

Check if backend service mocks are properly configured in `playwright.config.ts`.
E2E in CI runs against mock backends, not live services.

---

## Kubernetes / ArgoCD

### Pod in `ImagePullBackOff`

Image not yet pushed to ghcr.io or kustomization.yaml has a stale tag.

```bash
kubectl describe pod <pod-name> -n shopping-cart
# Check "Failed to pull image" message for the exact tag

# Verify image exists in ghcr.io
gh api /user/packages/container/shopping-cart-frontend/versions --jq '.[0]'
```

If the tag is stale, update `k8s/base/kustomization.yaml` in `shopping-cart-infra` and push.

### App shows `Degraded` in ArgoCD

```bash
kubectl get application shopping-cart-frontend -n cicd -o yaml | grep -A10 conditions
kubectl get pods -n shopping-cart -l app=shopping-cart-frontend
kubectl logs -n shopping-cart -l app=shopping-cart-frontend --previous
```

### Nginx returns 502 for API calls

Istio VirtualService or backend pod not ready.

```bash
kubectl get virtualservice -n shopping-cart
kubectl get pods -n shopping-cart
```
