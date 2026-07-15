import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { cartService } from '@/services/cartService'
import { orderService } from '@/services/orderService'
import { paymentService } from '@/services/paymentService'
import { useCartStore } from '@/stores/cartStore'
import type { AddToCartRequest, Address, PaymentMethod, UpdateCartItemRequest } from '@/types'

export interface CheckoutPaymentInput {
  paymentMethod: PaymentMethod
  cardNumber?: string
  cardExpMonth?: string
  cardExpYear?: string
  cardCvc?: string
  cardholderName?: string
}

export interface CheckoutInput {
  shippingAddress: Address
  payment: CheckoutPaymentInput
}

export function useCart() {
  const auth = useAuth()
  const setCart = useCartStore((state) => state.setCart)

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const cart = await cartService.getCart()
      setCart(cart)
      return cart
    },
    enabled: auth.isAuthenticated,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const setCart = useCartStore((state) => state.setCart)

  return useMutation({
    mutationFn: (item: AddToCartRequest) => cartService.addItem(item),
    onSuccess: (cart) => {
      setCart(cart)
      queryClient.setQueryData(['cart'], cart)
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const setCart = useCartStore((state) => state.setCart)

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateCartItemRequest }) =>
      cartService.updateItem(itemId, data),
    onSuccess: (cart) => {
      setCart(cart)
      queryClient.setQueryData(['cart'], cart)
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const setCart = useCartStore((state) => state.setCart)

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (cart) => {
      setCart(cart)
      queryClient.setQueryData(['cart'], cart)
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  const clearCart = useCartStore((state) => state.clearCart)

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      clearCart()
      queryClient.setQueryData(['cart'], null)
    },
  })
}

export function useCheckout() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const clearCart = useCartStore((state) => state.clearCart)

  return useMutation({
    mutationFn: async ({ shippingAddress, payment }: CheckoutInput) => {
      const customerId = auth.user?.profile?.sub
      if (!customerId) {
        throw new Error('You must be signed in to complete checkout.')
      }

      const cart = await cartService.getCart()
      if (cart.items.length === 0) {
        throw new Error('Your cart is empty.')
      }

      const order = await orderService.createOrder({
        customerId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        shippingAddress,
        currency: cart.currency,
      })

      const paymentResponse = await paymentService.processPayment({
        orderId: order.id,
        customerId,
        amount: order.totalAmount,
        currency: order.currency,
        gateway: 'mock',
        ...(payment.paymentMethod === 'CARD'
          ? {
              cardNumber: payment.cardNumber,
              cardExpMonth: payment.cardExpMonth,
              cardExpYear: payment.cardExpYear,
              cardCvc: payment.cardCvc,
              cardholderName: payment.cardholderName,
            }
          : {}),
      })

      if (paymentResponse.status === 'FAILED') {
        throw new Error(paymentResponse.failureReason || 'Payment failed.')
      }

      const paidOrder = await orderService.updateOrderStatus(order.id, {
        status: 'PAID',
        paymentId: paymentResponse.id,
        paymentMethod: payment.paymentMethod,
      })

      await cartService.clearCart()
      return paidOrder
    },
    onSuccess: () => {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
