import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Cart, AddToCartRequest, UpdateCartItemRequest } from '@/types'

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await api.get<Cart>(ENDPOINTS.CART)
    return response.data
  },

  async addItem(item: AddToCartRequest): Promise<Cart> {
    const response = await api.post<Cart>(ENDPOINTS.CART_ITEMS, item)
    return response.data
  },

  async updateItem(itemId: string, data: UpdateCartItemRequest): Promise<Cart> {
    const response = await api.put<Cart>(ENDPOINTS.CART_ITEM_BY_ID(itemId), data)
    return response.data
  },

  async removeItem(itemId: string): Promise<Cart> {
    const response = await api.delete<Cart>(ENDPOINTS.CART_ITEM_BY_ID(itemId))
    return response.data
  },

  async clearCart(): Promise<void> {
    await api.delete(ENDPOINTS.CART)
  },

  async checkout(): Promise<{ orderId: string }> {
    const response = await api.post<{ orderId: string }>(ENDPOINTS.CART_CHECKOUT)
    return response.data
  },
}
