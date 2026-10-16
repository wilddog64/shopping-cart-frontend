#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
nginx_conf=${NGINX_CONF:-"$repo_root/nginx.conf"}
tmp_dir=$(mktemp -d)
container_name="shopping-cart-nginx-cache-${RANDOM}-${RANDOM}"

cleanup() {
    docker rm -f "$container_name" >/dev/null 2>&1 || true
    rm -rf "$tmp_dir"
}
trap cleanup EXIT

mkdir -p "$tmp_dir/html/assets"
printf '<!doctype html><title>cache check</title>\n' > "$tmp_dir/html/index.html"
printf 'console.log("cache check");\n' > "$tmp_dir/html/assets/a.js"

docker run -d --name "$container_name" \
    --add-host order-service.shopping-cart-apps.svc.cluster.local:127.0.0.1 \
    --add-host product-catalog.shopping-cart-apps.svc.cluster.local:127.0.0.1 \
    --add-host basket-service.shopping-cart-apps.svc.cluster.local:127.0.0.1 \
    --add-host minio.shopping-cart-data.svc.cluster.local:127.0.0.1 \
    -v "$nginx_conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$tmp_dir/html:/usr/share/nginx/html:ro" \
    nginx:1.31-alpine >/dev/null

for attempt in {1..30}; do
    if docker exec "$container_name" wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1; then
        break
    fi
    if [[ "$attempt" == 30 ]]; then
        echo "nginx did not become ready" >&2
        docker logs "$container_name" >&2 || true
        exit 1
    fi
    sleep 1
done

assert_header() {
    local path=$1
    local header=$2
    local expected=$3
    local headers

    headers=$(docker exec "$container_name" wget -qSO- -O /dev/null "http://127.0.0.1:8080$path" 2>&1)
    if ! grep -i "^[[:space:]]*$header:" <<< "$headers" | grep -Fqi -- "$expected"; then
        echo "expected $header: $expected on $path" >&2
        printf '%s\n' "$headers" >&2
        exit 1
    fi
}

for path in / /index.html /some/route; do
    assert_header "$path" "Cache-Control" "no-cache"
    assert_header "$path" "Content-Security-Policy" "default-src"
done
assert_header /assets/a.js "Cache-Control" "immutable"

echo "nginx cache header checks passed"
