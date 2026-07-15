import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { PaymentRequest, PaymentResponse } from '@/types'

export const paymentService = {
  async processPayment(req: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>(ENDPOINTS.PAYMENTS, {
      ...req,
      idempotencyKey: req.idempotencyKey ?? crypto.randomUUID(),
    })
    return response.data
  },
}
