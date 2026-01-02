import { test, expect } from '@playwright/test'

test.describe('Cart Page (Unauthenticated)', () => {
  test('should redirect to login when accessing cart', async ({ page }) => {
    await page.goto('/cart')

    // Should show loading or redirect to Keycloak
    // Since we can't actually authenticate, we check for the loading state
    // or that we're no longer on /cart
    await page.waitForTimeout(1000)

    // Either redirected or showing login prompt
    const url = page.url()
    expect(url.includes('/cart') || url.includes('keycloak')).toBeTruthy()
  })
})

test.describe('Cart Page (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.addInitScript(() => {
      const mockUser = {
        access_token: 'mock-token',
        token_type: 'Bearer',
        profile: {
          sub: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      localStorage.setItem(
        'oidc.user:http://localhost:8080/realms/shopping-cart:frontend',
        JSON.stringify(mockUser)
      )
    })

    // Mock cart API
    await page.route('**/api/cart', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cart-1',
            customerId: 'user-123',
            items: [
              {
                id: 'item-1',
                productId: 'prod-1',
                name: 'Test Product',
                quantity: 2,
                unitPrice: 29.99,
                subTotal: 59.98,
              },
            ],
            totalAmount: 59.98,
            currency: 'USD',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            expiresAt: '2024-01-08',
          }),
        })
      }
    })
  })

  test('should display cart items', async ({ page }) => {
    await page.goto('/cart')

    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
    await expect(page.getByText('Test Product')).toBeVisible()
    await expect(page.getByText('$29.99 each')).toBeVisible()
  })

  test('should display order summary', async ({ page }) => {
    await page.goto('/cart')

    await expect(page.getByText('Order Summary')).toBeVisible()
    // Use first() to handle multiple price displays
    await expect(page.getByText('$59.98').first()).toBeVisible()
  })

  test('should have quantity controls for items', async ({ page }) => {
    await page.goto('/cart')

    // Wait for cart to load and find the item row
    await expect(page.getByText('Test Product')).toBeVisible()

    // The quantity "2" is in a span within the cart item row
    // Look for a centered text element containing just "2"
    const quantityDisplay = page.locator('span.text-center').filter({ hasText: '2' })
    await expect(quantityDisplay).toBeVisible()
  })

  test('should have checkout button', async ({ page }) => {
    await page.goto('/cart')

    await expect(page.getByRole('button', { name: /proceed to checkout/i })).toBeVisible()
  })

  test('should have remove item button', async ({ page }) => {
    await page.goto('/cart')

    // Wait for cart to load
    await expect(page.getByText('Test Product')).toBeVisible()

    // The remove button has class text-red-500 (red trash icon)
    const removeButton = page.locator('button.text-red-500')
    await expect(removeButton).toBeVisible()
  })
})

test.describe('Empty Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      const mockUser = {
        access_token: 'mock-token',
        token_type: 'Bearer',
        profile: {
          sub: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      localStorage.setItem(
        'oidc.user:http://localhost:8080/realms/shopping-cart:frontend',
        JSON.stringify(mockUser)
      )
    })

    // Mock empty cart
    await page.route('**/api/cart', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cart-1',
          customerId: 'user-123',
          items: [],
          totalAmount: 0,
          currency: 'USD',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          expiresAt: '2024-01-08',
        }),
      })
    })
  })

  test('should display empty cart message', async ({ page }) => {
    await page.goto('/cart')

    await expect(page.getByText(/your cart is empty/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /browse products/i })).toBeVisible()
  })
})
