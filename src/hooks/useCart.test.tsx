import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCheckout } from './useCart'
import { cartService } from '@/services/cartService'
import { orderService } from '@/services/orderService'
import { paymentService } from '@/services/paymentService'
import { useCartStore } from '@/stores/cartStore'
import type { Cart, Order } from '@/types'

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { profile: { sub: 'customer-1' } },
  }),
}))

vi.mock('@/services/cartService', () => ({
  cartService: {
    getCart: vi.fn(),
    clearCart: vi.fn(),
  },
}))

vi.mock('@/services/orderService', () => ({
  orderService: {
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}))

vi.mock('@/services/paymentService', () => ({
  paymentService: {
    processPayment: vi.fn(),
  },
}))

const mockCart: Cart = {
  id: 'cart-1',
  customerId: 'customer-1',
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      name: 'Coffee Beans',
      quantity: 2,
      unitPrice: 12.5,
      subTotal: 25,
    },
  ],
  totalAmount: 25,
  currency: 'USD',
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  expiresAt: '2026-07-16T00:00:00Z',
}

const pendingOrder: Order = {
  id: 'order-1',
  customerId: 'customer-1',
  items: [
    {
      id: 'order-item-1',
      productId: 'product-1',
      name: 'Coffee Beans',
      quantity: 2,
      unitPrice: 12.5,
      subTotal: 25,
    },
  ],
  totalAmount: 25,
  currency: 'USD',
  status: 'PENDING',
  shippingAddress: {
    street: '1 Main St',
    city: 'Portland',
    state: 'OR',
    postalCode: '97201',
    country: 'USA',
  },
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCartStore.setState({ cart: mockCart, itemCount: 2, isLoading: false, error: null })
  })

  it('creates an order, processes card payment, and clears the cart on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(cartService.getCart).mockResolvedValue(mockCart)
    vi.mocked(orderService.createOrder).mockResolvedValue(pendingOrder)
    vi.mocked(paymentService.processPayment).mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: 'COMPLETED',
      cardLast4: '4242',
    })
    vi.mocked(orderService.updateOrderStatus).mockResolvedValue({
      ...pendingOrder,
      status: 'PAID',
    })
    vi.mocked(cartService.clearCart).mockResolvedValue(undefined)

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(queryClient),
    })

    let order: Order
    await act(async () => {
      order = await result.current.mutateAsync({
        shippingAddress: pendingOrder.shippingAddress!,
        payment: {
          paymentMethod: 'CARD',
          cardNumber: '4242424242424242',
          cardExpMonth: '12',
          cardExpYear: '2030',
          cardCvc: '123',
          cardholderName: 'Test User',
        },
      })
    })

    expect(orderService.createOrder).toHaveBeenCalledWith({
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          productName: 'Coffee Beans',
          quantity: 2,
          unitPrice: 12.5,
        },
      ],
      shippingAddress: pendingOrder.shippingAddress,
      currency: 'USD',
    })
    expect(paymentService.processPayment).toHaveBeenCalledWith({
      orderId: 'order-1',
      customerId: 'customer-1',
      amount: 25,
      currency: 'USD',
      gateway: 'mock',
      cardNumber: '4242424242424242',
      cardExpMonth: '12',
      cardExpYear: '2030',
      cardCvc: '123',
      cardholderName: 'Test User',
    })
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('order-1', {
      status: 'PAID',
      paymentId: 'payment-1',
      paymentMethod: 'CARD',
    })
    expect(cartService.clearCart).toHaveBeenCalledTimes(1)
    expect(useCartStore.getState().cart).toBeNull()
    expect(order!.id).toBe('order-1')
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cart'] })
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
    })
  })

  it('surfaces payment decline errors and preserves the cart', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    vi.mocked(cartService.getCart).mockResolvedValue(mockCart)
    vi.mocked(orderService.createOrder).mockResolvedValue(pendingOrder)
    vi.mocked(paymentService.processPayment).mockResolvedValue({
      id: 'payment-2',
      orderId: 'order-1',
      status: 'FAILED',
      failureReason: 'Your card was declined',
    })

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(queryClient),
    })

    await expect(
      act(async () =>
        result.current.mutateAsync({
          shippingAddress: pendingOrder.shippingAddress!,
          payment: {
            paymentMethod: 'CARD',
            cardNumber: '4000000000000002',
            cardExpMonth: '12',
            cardExpYear: '2030',
            cardCvc: '123',
            cardholderName: 'Declined User',
          },
        })
      )
    ).rejects.toThrow('Your card was declined')

    expect(orderService.updateOrderStatus).not.toHaveBeenCalled()
    expect(cartService.clearCart).not.toHaveBeenCalled()
    expect(useCartStore.getState().cart).toEqual(mockCart)
  })

  it('supports simulated bank payments without card fields', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    vi.mocked(cartService.getCart).mockResolvedValue(mockCart)
    vi.mocked(orderService.createOrder).mockResolvedValue(pendingOrder)
    vi.mocked(paymentService.processPayment).mockResolvedValue({
      id: 'payment-bank-1',
      orderId: 'order-1',
      status: 'COMPLETED',
    })
    vi.mocked(orderService.updateOrderStatus).mockResolvedValue({
      ...pendingOrder,
      status: 'PAID',
    })
    vi.mocked(cartService.clearCart).mockResolvedValue(undefined)

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        shippingAddress: pendingOrder.shippingAddress!,
        payment: {
          paymentMethod: 'BANK',
          cardholderName: 'Bank User',
        },
      })
    })

    expect(paymentService.processPayment).toHaveBeenCalledWith({
      orderId: 'order-1',
      customerId: 'customer-1',
      amount: 25,
      currency: 'USD',
      gateway: 'mock',
    })
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('order-1', {
      status: 'PAID',
      paymentId: 'payment-bank-1',
      paymentMethod: 'BANK',
    })
  })
})
