import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from '@/types'

type Wrapped<T> = { success: boolean; data: T }

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await api.get<Wrapped<Cart>>(ENDPOINTS.CART)
    return response.data.data
  },

  async addItem(item: AddToCartRequest): Promise<Cart> {
    const response = await api.post<Wrapped<Cart>>(ENDPOINTS.CART_ITEMS, item)
    return response.data.data
  },

  async updateItem(itemId: string, data: UpdateCartItemRequest): Promise<Cart> {
    const response = await api.put<Wrapped<Cart>>(ENDPOINTS.CART_ITEM_BY_ID(itemId), data)
    return response.data.data
  },

  async removeItem(itemId: string): Promise<Cart> {
    const response = await api.delete<Wrapped<Cart>>(ENDPOINTS.CART_ITEM_BY_ID(itemId))
    return response.data.data
  },

  async clearCart(): Promise<void> {
    await api.delete(ENDPOINTS.CART)
  },

  async checkout(): Promise<{ orderId: string }> {
    const response = await api.post<Wrapped<{ orderId: string }>>(ENDPOINTS.CART_CHECKOUT)
    return response.data.data
  },
}
