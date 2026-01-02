import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should display the home page with hero section', async ({ page }) => {
    await page.goto('/')

    // Check hero title - h1 contains "Welcome to" text
    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
    await expect(heroHeading).toContainText('Welcome to')
    await expect(heroHeading).toContainText('ShopCart')

    // Check CTA button
    await expect(page.getByRole('link', { name: /browse products/i })).toBeVisible()
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Wide Selection' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fast Delivery' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Secure Shopping' })).toBeVisible()
  })

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/')

    // Mock products API for navigation
    await page.route('**/api/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 }),
      })
    })

    await page.getByRole('link', { name: /browse products/i }).click()

    await expect(page).toHaveURL('/products')
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
  })

  test('should have header navigation', async ({ page, viewport }) => {
    await page.goto('/')

    // Check header elements - use locator within header
    const header = page.locator('header')
    await expect(header.getByText('ShopCart')).toBeVisible()

    // Products link is hidden on mobile (hidden md:flex in CSS)
    const isMobile = viewport && viewport.width < 768
    if (!isMobile) {
      await expect(header.getByRole('link', { name: /products/i })).toBeVisible()
    }

    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should have footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/all rights reserved/i)).toBeVisible()
    // Privacy Policy is an anchor tag in footer
    await expect(page.locator('footer').getByText('Privacy Policy')).toBeVisible()
  })
})
