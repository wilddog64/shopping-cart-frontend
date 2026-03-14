import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Order, PaginatedResponse } from '@/types'

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  status?: string
}

export const orderService = {
  async getOrders(params: GetOrdersParams = {}): Promise<PaginatedResponse<Order>> {
    const { page = 1, pageSize = 10, status } = params
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    if (status) queryParams.append('status', status)

    const response = await api.get<PaginatedResponse<Order>>(`${ENDPOINTS.ORDERS}?${queryParams}`)
    return response.data
  },

  async getOrderById(id: string): Promise<Order> {
    const response = await api.get<Order>(ENDPOINTS.ORDER_BY_ID(id))
    return response.data
  },

  async cancelOrder(id: string): Promise<Order> {
    const response = await api.post<Order>(`${ENDPOINTS.ORDER_BY_ID(id)}/cancel`)
    return response.data
  },
}
