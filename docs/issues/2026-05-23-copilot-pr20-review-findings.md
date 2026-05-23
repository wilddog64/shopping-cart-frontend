# Copilot PR #20 Review Findings

**Date:** 2026-05-23
**PR:** #20 — feat: proxy MinIO images and wire full-text search param
**Fix commit:** `6aedc09`

## Finding 1 — nginx proxy exposes all MinIO buckets, not just product-images

**File:** `nginx.conf` line 64
**Flagged:** `location ^~ /minio/` proxies all paths under `/minio/`, which exposes all MinIO buckets and the MinIO API endpoints to the browser (including admin/management paths on port 9000).

**Fix:**
```nginx
# Before — exposes all MinIO paths
location ^~ /minio/ {
    proxy_pass http://minio.shopping-cart-data.svc.cluster.local:9000/;
    ...
}

# After — limited to product-images bucket only
location ^~ /minio/product-images/ {
    proxy_pass http://minio.shopping-cart-data.svc.cluster.local:9000/product-images/;
    ...
}
```

**Root cause:** Initial implementation proxied the entire MinIO namespace; the spec said "proxy product images" but didn't specify the path narrowing explicitly.

**Process note:** MinIO nginx proxy must always scope to the specific bucket path (`/minio/<bucket>/`) to avoid exposing the full MinIO API surface.

---

## Finding 2 — Missing X-Forwarded-Proto vs other proxy blocks

**File:** `nginx.conf` line 64–70
**Flagged:** The MinIO proxy block was missing `proxy_set_header X-Forwarded-Proto $scheme` present in all other proxy locations (`/api/orders`, `/api/products`, `/api/cart`).

**Fix:** Added `proxy_set_header X-Forwarded-Proto $scheme;` to the MinIO proxy block for consistency.

**Root cause:** MinIO proxy block was added independently of the API proxy blocks without checking for consistency.

**Process note:** When adding a new nginx proxy location, copy all headers from an existing sibling proxy block and verify consistency before committing.
