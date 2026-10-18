import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const defaultNginxConfigPath = resolve(dirname(fileURLToPath(import.meta.url)), '../nginx.conf')

function readProductImageLocation() {
  const nginxConfig = readFileSync(process.env.NGINX_CONF_PATH ?? defaultNginxConfigPath, 'utf8')
  const locationMatch = nginxConfig.match(/(^\s*location \^~ \/minio\/product-images\/ \{[\s\S]*?^\s*\})/m)

  if (!locationMatch) {
    throw new Error('Could not find the product image location in nginx.conf')
  }

  return locationMatch[1]
}

describe('product image nginx cache policy', () => {
  test('sets a short cache TTL without weakening the location contract', () => {
    const location = readProductImageLocation()

    expect(location).toContain('add_header Cache-Control "public, max-age=300" always;')
    expect(location).toContain('proxy_hide_header Cache-Control;')

    const maxAges = [...location.matchAll(/max-age\s*=\s*(\d+)/gi)].map((match) => Number(match[1]))
    expect(maxAges.every((maxAge) => maxAge <= 300)).toBe(true)
    expect(location).not.toMatch(/immutable/i)

    expect(location).toMatch(/^\s*location \^~ \/minio\/product-images\/ \{$/m)
    expect(location).toContain(
      'proxy_pass http://minio.shopping-cart-data.svc.cluster.local:9000/product-images/;',
    )
  })
})
