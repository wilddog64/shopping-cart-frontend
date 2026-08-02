import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Order, PaginatedResponse, OrderCheckoutRequest, CheckoutResult } from '@/types'

export interface GetOrdersParams {
  page?: number
  pageSize?: number
  status?: string
  customerId?: string
}

interface CheckoutResponseBody {
  orderId: string
  amount: string
  currency: string
  paymentStatus: 'PAID' | 'FAILED'
  retryable?: boolean
  failureReason?: string
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

  async cancelOrder(id: string): Promise<Order> {
    const response = await api.post<Order>(`${ENDPOINTS.ORDER_BY_ID(id)}/cancel`)
    return response.data
  },

  async checkout(req: OrderCheckoutRequest): Promise<CheckoutResult> {
    const response = await api.post<CheckoutResponseBody>(ENDPOINTS.ORDER_CHECKOUT, req, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 402,
    })
    const body = response.data
    if (body.paymentStatus === 'PAID') {
      return { status: 'PAID', orderId: body.orderId, amount: body.amount, currency: body.currency }
    }
    return {
      status: 'FAILED',
      orderId: body.orderId,
      retryable: body.retryable ?? true,
      failureReason: body.failureReason ?? 'Payment failed. Please try again.',
    }
  },
}
