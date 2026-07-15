import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { ENDPOINTS } from '@/config/api'
import { paymentService } from './paymentService'

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'payment-attempt-123'),
    })
  })

  it('posts payment requests with a generated idempotency key', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'payment-1',
        orderId: 'order-1',
        status: 'COMPLETED',
      },
    })

    const response = await paymentService.processPayment({
      orderId: 'order-1',
      customerId: 'customer-1',
      amount: 149.99,
      currency: 'USD',
      gateway: 'mock',
      cardNumber: '4242424242424242',
      cardExpMonth: '12',
      cardExpYear: '2030',
      cardCvc: '123',
      cardholderName: 'Test User',
    })

    expect(api.post).toHaveBeenCalledWith(ENDPOINTS.PAYMENTS, {
      orderId: 'order-1',
      customerId: 'customer-1',
      amount: 149.99,
      currency: 'USD',
      gateway: 'mock',
      cardNumber: '4242424242424242',
      cardExpMonth: '12',
      cardExpYear: '2030',
      cardCvc: '123',
      cardholderName: 'Test User',
      idempotencyKey: 'payment-attempt-123',
    })
    expect(response.status).toBe('COMPLETED')
  })
})
