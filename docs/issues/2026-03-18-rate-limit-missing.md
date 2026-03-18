# Issue: Frontend nginx Has No Rate Limiting

**Date:** 2026-03-18
**Status:** Open

## Problem

`nginx.conf` has no `limit_req_zone` or `limit_req` directives. The frontend is the
public entry point — all traffic (browser, bots, attackers) passes through it before
reaching backend services. Without nginx-level rate limiting, a flood hits the
application tier directly.

nginx rate limiting is the cheapest and most effective layer — it runs before any
application code and requires zero dependencies.

## Fix: Add `limit_req_zone` to nginx.conf

### Changes to `nginx.conf`

Add at the `http` block level (before `server`):

```nginx
# Rate limiting zones — defined at http level
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=static_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=health_limit:1m rate=10r/s;
```

Apply in the `server` block:

```nginx
# API proxy locations — strict limit with burst
location /api/orders {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    # ... existing proxy_pass config ...
}

location /api/products {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    # ... existing proxy_pass config ...
}

location /api/cart {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    # ... existing proxy_pass config ...
}

# Static assets — generous limit
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    limit_req zone=static_limit burst=50 nodelay;
    limit_req_status 429;
    # ... existing expires / cache-control config ...
}

# Health check — no rate limit needed (internal only)
location /health {
    # no limit_req — keep as is
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

### Zones explanation

| Zone | Rate | Burst | Target |
|---|---|---|---|
| `api_limit` | 30 req/s per IP | 20 | `/api/*` proxy routes |
| `static_limit` | 100 req/s per IP | 50 | Static asset requests |

`nodelay` — burst requests are served immediately without queuing delay; excess
requests beyond burst are rejected with 429 immediately.

`$binary_remote_addr` — uses 4 bytes (IPv4) or 16 bytes (IPv6) per key;
10m zone holds ~160k IPv4 addresses.

### 429 response

nginx default 429 response is plain HTML. Add a JSON body for consistency:

```nginx
error_page 429 /429.json;
location = /429.json {
    internal;
    default_type application/json;
    return 429 '{"error":"Too many requests","message":"Rate limit exceeded. Please retry later."}';
}
```

## Definition of Done

- [ ] `limit_req_zone` directives added at `http` level (requires Dockerfile to expose `http` block — see note below)
- [ ] `limit_req` applied to all 3 API proxy locations
- [ ] `limit_req` applied to static assets location
- [ ] Health endpoint has no rate limit
- [ ] 429 returns JSON body
- [ ] `nginx -t` passes in CI (add to Dockerfile build step)
- [ ] No changes to React source, CI workflow, or k8s manifests

## Note on Dockerfile

The current `nginx.conf` is a `server` block only. `limit_req_zone` must be in
the `http` block. Options:
1. Wrap the current `nginx.conf` in an `http { ... }` block (preferred — full control)
2. Place `limit_req_zone` in a separate `/etc/nginx/conf.d/rate-limit.conf` and
   mount it alongside the existing config (simpler if Dockerfile copies conf.d/)

Check the Dockerfile to confirm which approach fits the current setup.

## What NOT to Do

- Do NOT add rate limiting to the `/health` endpoint
- Do NOT change React source code or build process
- Do NOT modify k8s Service or Deployment manifests
