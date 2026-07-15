import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { CreateOrderRequest, Order, PaginatedResponse, UpdateOrderStatusRequest } from '@/types'

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  status?: string
  customerId?: string
}

export const orderService = {
  async getOrders(params: GetOrdersParams = {}): Promise<PaginatedResponse<Order>> {
    const { page = 1, pageSize = 10, status, customerId } = params
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    if (status) queryParams.append('status', status)
    if (customerId) queryParams.append('customerId', customerId)

    const response = await api.get<Order[]>(`${ENDPOINTS.ORDERS}?${queryParams}`)
    const items = Array.isArray(response.data) ? response.data : []
    return {
      data: items,
      page,
      pageSize,
      totalItems: items.length,
      totalPages: 1,
    }
  },

  async getOrderById(id: string): Promise<Order> {
    const response = await api.get<Order>(ENDPOINTS.ORDER_BY_ID(id))
    return response.data
  },

  async createOrder(req: CreateOrderRequest): Promise<Order> {
    const response = await api.post<Order>(ENDPOINTS.ORDERS, req)
    return response.data
  },

  async updateOrderStatus(id: string, body: UpdateOrderStatusRequest): Promise<Order> {
    const response = await api.patch<Order>(ENDPOINTS.ORDER_STATUS(id), body)
    return response.data
  },

  async cancelOrder(id: string): Promise<Order> {
    const response = await api.post<Order>(`${ENDPOINTS.ORDER_BY_ID(id)}/cancel`)
    return response.data
  },
}
