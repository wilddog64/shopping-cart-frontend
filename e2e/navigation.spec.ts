import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate through main pages', async ({ page, viewport }) => {
    // Mock products API
    await page.route('**/api/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 }),
      })
    })

    // Start at home
    await page.goto('/')
    await expect(page).toHaveURL('/')

    // On mobile, header nav links are hidden - use Browse Products button instead
    const isMobile = viewport && viewport.width < 768
    if (isMobile) {
      // Use the hero CTA button to navigate
      await page.getByRole('link', { name: /browse products/i }).click()
    } else {
      // Navigate to products via header link
      await page.locator('header').getByRole('link', { name: /products/i }).click()
    }
    await expect(page).toHaveURL('/products')

    // Navigate back to home via logo (ShopCart text in header)
    await page.locator('header').getByText('ShopCart').click()
    await expect(page).toHaveURL('/')
  })

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-page')

    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText(/page not found/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
  })

  test('should navigate from 404 back to home', async ({ page }) => {
    await page.goto('/unknown-page')

    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Header', () => {
  test('should display login button when not authenticated', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should not show cart icon when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Cart icon (ShoppingCart) link should not be visible for unauthenticated users
    // The cart link goes to /cart, check for that specific link
    const cartLinks = page.locator('header a[href="/cart"]')
    await expect(cartLinks).toHaveCount(0)
  })

  test('should not show orders link when not authenticated', async ({ page }) => {
    await page.goto('/')

    const ordersLinks = page.locator('header').getByRole('link', { name: /orders/i })
    await expect(ordersLinks).toHaveCount(0)
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Hero heading should be visible
    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
    await expect(heroHeading).toContainText('Welcome to')

    // Features should stack vertically (we can check they're all visible)
    await expect(page.getByRole('heading', { name: 'Wide Selection' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fast Delivery' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Secure Shopping' })).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
    await expect(heroHeading).toContainText('Welcome to')
    await expect(page.getByRole('link', { name: /browse products/i })).toBeVisible()
  })

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
    await expect(heroHeading).toContainText('Welcome to')
    await expect(page.locator('header').getByRole('link', { name: /products/i })).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')

    // Should have h1
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
  })

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/')

    const buttons = page.getByRole('button')
    const count = await buttons.count()

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      // Each button should have accessible name
      const name = await button.getAttribute('aria-label') || await button.textContent()
      expect(name).toBeTruthy()
    }
  })

  test('should have accessible links', async ({ page }) => {
    await page.goto('/')

    const links = page.getByRole('link')
    const count = await links.count()

    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      const name = await link.textContent()
      expect(name?.trim()).toBeTruthy()
    }
  })
})
