# Issue: MinIO product images return 404 because nginx regex handling steals `/minio/product-images/` requests

**Date:** 2026-05-26
**Repository:** `shopping-cart-frontend`
**Branch:** `fix/minio-image-proxy-regex-order`
**Status:** Open

## Symptoms

Product cards render text and price correctly, but the image area shows a broken image placeholder.

Example product:

- `PrimeWave Desk Mat Pro 3.0`
- `image_url` resolves to `/minio/product-images/deskpad.jpg`

The live frontend returns `404 Not Found` for that browser URL even though MinIO has the file.

## What was tested

From the frontend pod in the rebuilt remote cluster:

```bash
curl -I http://127.0.0.1:8080/minio/product-images/deskpad.jpg
curl -I http://minio.shopping-cart-data.svc.cluster.local:9000/product-images/deskpad.jpg
```

Observed behavior:

- the MinIO service itself returns `200 OK` for the object
- the frontend origin returns `404 Not Found` for the same path

## Root Cause

The deployed nginx config has both:

- a prefix location for `/minio/product-images/`
- a regex static-asset block matching `*.jpg`

Without the `^~` modifier on the MinIO prefix location, nginx is allowed to hand `.jpg` requests to the later regex location instead of proxying them to MinIO.

That means the browser requests the correct URL, but nginx routes the request to the wrong handler and returns 404.

## Evidence

The live frontend pod currently runs nginx config that includes:

```nginx
location /minio/product-images/ {
    proxy_pass http://minio.shopping-cart-data.svc.cluster.local:9000/product-images/;
}

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
}
```

The earlier working frontend commit used:

```nginx
location ^~ /minio/product-images/ {
    proxy_pass http://minio.shopping-cart-data.svc.cluster.local:9000/product-images/;
}
```

That `^~` is the missing guard.

## Recommended Fix

Update the frontend nginx config to use:

```nginx
location ^~ /minio/product-images/ {
```

This ensures `.jpg` requests under `/minio/product-images/` always go to MinIO and are not intercepted by the static asset regex.

## Verification

After the fix is built and deployed:

- `curl -I http://127.0.0.1:8080/minio/product-images/deskpad.jpg` should return `200 OK`
- product cards should display images again after a page refresh
