import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import CheckoutPage from './CheckoutPage'
import { orderService } from '@/services/orderService'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const createPaymentMethodMock = vi.fn()
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ createPaymentMethod: createPaymentMethodMock }),
  useElements: () => ({ getElement: () => ({}) }),
}))
vi.mock('@/config/stripe', () => ({ stripePromise: Promise.resolve({}) }))
vi.mock('@/services/orderService', () => ({ orderService: { checkout: vi.fn() } }))

function fillAddress() {
  fireEvent.change(screen.getByLabelText('street'), { target: { value: '123 Dev Lane' } })
  fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Cloud City' } })
  fireEvent.change(screen.getByLabelText('state'), { target: { value: 'K8s' } })
  fireEvent.change(screen.getByLabelText('postalCode'), { target: { value: '10101' } })
  fireEvent.change(screen.getByLabelText('country'), { target: { value: 'US' } })
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createPaymentMethodMock.mockResolvedValue({ paymentMethod: { id: 'pm_card_visa' } })
  })

  it('does not submit and shows errors when fields are empty', async () => {
    render(<CheckoutPage />)
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/street is required/i)).toBeInTheDocument()
    expect(orderService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('creates a PaymentMethod, checks out, and navigates to the order on PAID', async () => {
    vi.mocked(orderService.checkout).mockResolvedValue({ status: 'PAID', orderId: 'ord-1', amount: '21.00', currency: 'USD' })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    await waitFor(() => expect(orderService.checkout).toHaveBeenCalledWith({ shippingAddress: { street: '123 Dev Lane', city: 'Cloud City', state: 'K8s', postalCode: '10101', country: 'US' }, paymentMethodId: 'pm_card_visa' }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/orders/ord-1'))
  })

  it('shows the failure reason and does not navigate when payment is declined', async () => {
    vi.mocked(orderService.checkout).mockResolvedValue({ status: 'FAILED', orderId: 'ord-1', retryable: true, failureReason: 'Your card was declined.' })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/your card was declined/i)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('surfaces a card error and never calls checkout when card tokenization fails', async () => {
    createPaymentMethodMock.mockResolvedValue({ error: { message: 'Invalid card number.' } })
    render(<CheckoutPage />)
    fillAddress()
    fireEvent.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByText(/invalid card number/i)).toBeInTheDocument()
    expect(orderService.checkout).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
