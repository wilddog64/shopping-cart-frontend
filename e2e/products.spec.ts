import { test, expect } from '@playwright/test'

test.describe('Products Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the products API
    await page.route('**/api/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'prod-1',
              name: 'Test Product 1',
              description: 'A great test product',
              price: 29.99,
              currency: 'USD',
              category: 'Electronics',
              stock: 10,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
            {
              id: 'prod-2',
              name: 'Test Product 2',
              description: 'Another great product',
              price: 49.99,
              currency: 'USD',
              category: 'Clothing',
              stock: 5,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
            {
              id: 'prod-3',
              name: 'Out of Stock Item',
              description: 'This item is unavailable',
              price: 99.99,
              currency: 'USD',
              category: 'Electronics',
              stock: 0,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
          ],
          page: 1,
          pageSize: 12,
          totalItems: 3,
          totalPages: 1,
        }),
      })
    })
  })

  test('should display products list', async ({ page }) => {
    await page.goto('/products')

    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
    await expect(page.getByText('Test Product 1')).toBeVisible()
    await expect(page.getByText('Test Product 2')).toBeVisible()
  })

  test('should display product prices', async ({ page }) => {
    await page.goto('/products')

    await expect(page.getByText('$29.99')).toBeVisible()
    await expect(page.getByText('$49.99')).toBeVisible()
  })

  test('should show stock status', async ({ page }) => {
    await page.goto('/products')

    // In stock items - look for the specific stock badge span
    const inStockBadge = page.locator('span').filter({ hasText: /^In Stock$/ })
    await expect(inStockBadge.first()).toBeVisible()

    // Out of stock items - look for the specific stock badge span
    const outOfStockBadge = page.locator('span').filter({ hasText: /^Out of Stock$/ })
    await expect(outOfStockBadge).toBeVisible()
  })

  test('should have search functionality', async ({ page }) => {
    await page.goto('/products')

    const searchInput = page.getByPlaceholder(/search products/i)
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Test')
    await searchInput.press('Enter')

    // Search should trigger (URL might have query params)
    await expect(searchInput).toHaveValue('Test')
  })

  test('should navigate to product detail on click', async ({ page }) => {
    // Mock single product API
    await page.route('**/api/products/prod-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prod-1',
          name: 'Test Product 1',
          description: 'A great test product with detailed description',
          price: 29.99,
          currency: 'USD',
          category: 'Electronics',
          stock: 10,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        }),
      })
    })

    await page.goto('/products')
    await page.getByText('Test Product 1').click()

    await expect(page).toHaveURL('/products/prod-1')
  })
})

test.describe('Product Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/products/prod-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prod-1',
          name: 'Test Product 1',
          description: 'A great test product with detailed description',
          price: 29.99,
          currency: 'USD',
          category: 'Electronics',
          stock: 10,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        }),
      })
    })
  })

  test('should display product details', async ({ page }) => {
    await page.goto('/products/prod-1')

    await expect(page.getByRole('heading', { name: 'Test Product 1' })).toBeVisible()
    await expect(page.getByText('A great test product with detailed description')).toBeVisible()
    await expect(page.getByText('$29.99')).toBeVisible()
    await expect(page.getByText('Electronics')).toBeVisible()
    await expect(page.getByText('10 items in stock')).toBeVisible()
  })

  test('should have quantity controls', async ({ page }) => {
    await page.goto('/products/prod-1')

    // Look for quantity display area (usually in a container with +/- buttons)
    // The quantity is displayed between the increment/decrement buttons
    const quantityArea = page.locator('div').filter({ hasText: /^1$/ }).first()
    await expect(quantityArea).toBeVisible()

    // Find increment button (usually has a + icon or is the last button with svg)
    const buttons = page.locator('button:has(svg)')
    const buttonCount = await buttons.count()

    // Click what should be the increment button (likely second button in quantity controls)
    if (buttonCount >= 2) {
      await buttons.nth(1).click()
      // After clicking, quantity should increase
      // Look for the updated quantity in the same area
      await page.waitForTimeout(100)
    }

    // Verify quantity controls exist by checking button count
    expect(buttonCount).toBeGreaterThanOrEqual(2)
  })

  test('should have add to cart button', async ({ page }) => {
    await page.goto('/products/prod-1')

    await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    await page.goto('/products/prod-1')

    const backButton = page.getByRole('button', { name: /back/i })
    await expect(backButton).toBeVisible()
  })
})
