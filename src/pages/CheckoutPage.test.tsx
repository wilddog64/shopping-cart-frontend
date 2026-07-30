import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import CheckoutPage from './CheckoutPage'
import { cartService } from '@/services/cartService'
import type { Cart } from '@/types'

const EMPTY_CART: Cart = {
  id: 'cart-1',
  customerId: 'customer-1',
  items: [],
  totalAmount: 0,
  currency: 'USD',
  createdAt: '2026-07-30T00:00:00Z',
  updatedAt: '2026-07-30T00:00:00Z',
  expiresAt: '2026-07-31T00:00:00Z',
}

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('@/services/cartService', () => ({
  cartService: { checkout: vi.fn() },
}))

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not submit and shows errors when fields are empty', async () => {
    render(<CheckoutPage />)
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/street is required/i)).toBeInTheDocument()
    expect(cartService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('sends the shipping address and navigates to /orders on success', async () => {
    vi.mocked(cartService.checkout).mockResolvedValue(EMPTY_CART)
    render(<CheckoutPage />)
    fireEvent.change(screen.getByLabelText('street'), { target: { value: '123 Dev Lane' } })
    fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Cloud City' } })
    fireEvent.change(screen.getByLabelText('state'), { target: { value: 'K8s' } })
    fireEvent.change(screen.getByLabelText('postalCode'), { target: { value: '10101' } })
    fireEvent.change(screen.getByLabelText('country'), { target: { value: 'US' } })
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    await waitFor(() =>
      expect(cartService.checkout).toHaveBeenCalledWith({
        shippingAddress: {
          street: '123 Dev Lane',
          city: 'Cloud City',
          state: 'K8s',
          postalCode: '10101',
          country: 'US',
        },
      })
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/orders'))
  })
})
