# Retrospective — PR #22: Product Detail Field Mapping Fix

**Date:** 2026-05-25
**PR:** #22 — merged to main
**Participants:** Claude, Codex, Copilot

## What Went Well
- Codex applied the spec correctly on first attempt
- Copilot caught three valid issues: mapProduct duplication, overly broad /minio/ scope, wrong Host header
- All Copilot threads addressed and resolved before merge

## What Went Wrong
- Original spec described `return response.data` as the old code, but actual file had `return mapProduct(response.data)` — spec was written from a stale read
- nginx /minio/ block was too broad (full API surface exposed); spec should have scoped to /product-images/ from the start

## Decisions Made
- nginx MinIO proxy scoped to `/minio/product-images/` only — not the full `/minio/` prefix
- `Host $proxy_host` used for MinIO upstream (not `$host`) — passes internal service hostname
- `getProductById` delegates to `mapProduct()` — no inline duplication

## Theme
Two bugs on the product detail page (Out of Stock + No Image Available) traced to a missing field mapping in getProductById and an absent nginx proxy for MinIO. Codex applied the fix; Copilot caught three follow-on improvements to scope and code quality.
