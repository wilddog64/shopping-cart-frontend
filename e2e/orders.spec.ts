import { test, expect } from '@playwright/test'

test.describe('Orders Page', () => {
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

    // Mock orders API
    await page.route('**/api/orders**', async (route) => {
      if (route.request().url().includes('/orders/order-1')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'order-1',
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
            status: 'CONFIRMED',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'order-1',
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
                status: 'CONFIRMED',
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
              },
              {
                id: 'order-2',
                customerId: 'user-123',
                items: [
                  {
                    id: 'item-2',
                    productId: 'prod-2',
                    name: 'Another Product',
                    quantity: 1,
                    unitPrice: 49.99,
                    subTotal: 49.99,
                  },
                ],
                totalAmount: 49.99,
                currency: 'USD',
                status: 'DELIVERED',
                createdAt: '2024-01-10T14:00:00Z',
                updatedAt: '2024-01-12T09:00:00Z',
              },
            ],
            page: 1,
            pageSize: 10,
            totalItems: 2,
            totalPages: 1,
          }),
        })
      }
    })
  })

  test('should display orders list', async ({ page }) => {
    await page.goto('/orders')

    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible()
    await expect(page.getByText('CONFIRMED')).toBeVisible()
    await expect(page.getByText('DELIVERED')).toBeVisible()
  })

  test('should display order totals', async ({ page }) => {
    await page.goto('/orders')

    await expect(page.getByText('$59.98')).toBeVisible()
    await expect(page.getByText('$49.99')).toBeVisible()
  })

  test('should display order dates', async ({ page }) => {
    await page.goto('/orders')

    // Date formatting may vary, but should contain the month
    await expect(page.getByText(/january/i).first()).toBeVisible()
  })

  test('should navigate to order detail', async ({ page }) => {
    await page.goto('/orders')

    // Click on first order
    await page.getByText('CONFIRMED').click()

    await expect(page).toHaveURL(/\/orders\/order-1/)
  })
})

test.describe('Order Detail Page', () => {
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

    // Mock order detail API
    await page.route('**/api/orders/order-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order-1',
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
          status: 'PENDING',
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
          },
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        }),
      })
    })
  })

  test('should display order details', async ({ page }) => {
    await page.goto('/orders/order-1')

    await expect(page.getByText(/order #order-1/i)).toBeVisible()
    await expect(page.getByText('PENDING')).toBeVisible()
    await expect(page.getByText('Test Product')).toBeVisible()
    // Use first() to handle multiple price displays
    await expect(page.getByText('$59.98').first()).toBeVisible()
  })

  test('should display shipping address', async ({ page }) => {
    await page.goto('/orders/order-1')

    await expect(page.getByText('Shipping Address')).toBeVisible()
    await expect(page.getByText('123 Main St')).toBeVisible()
    await expect(page.getByText(/new york/i)).toBeVisible()
  })

  test('should show cancel button for pending orders', async ({ page }) => {
    await page.goto('/orders/order-1')

    await expect(page.getByRole('button', { name: /cancel order/i })).toBeVisible()
  })

  test('should have back button', async ({ page }) => {
    await page.goto('/orders/order-1')

    await expect(page.getByRole('button', { name: /back to orders/i })).toBeVisible()
  })
})

test.describe('Empty Orders', () => {
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

    // Mock empty orders
    await page.route('**/api/orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        }),
      })
    })
  })

  test('should display no orders message', async ({ page }) => {
    await page.goto('/orders')

    await expect(page.getByText(/no orders yet/i)).toBeVisible()
    await expect(page.getByText(/start shopping/i)).toBeVisible()
  })
})
