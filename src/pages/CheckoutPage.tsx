import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Landmark, ShoppingBag } from 'lucide-react'
import { useCart, useCheckout, type CheckoutInput } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/format'

type TenderOption = 'card' | 'bank' | 'test-decline'

const DECLINE_CARD = {
  cardNumber: '4000000000000002',
  cardExpMonth: '12',
  cardExpYear: '2030',
  cardCvc: '123',
  cardholderName: 'Declined Test Card',
} as const

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading, error } = useCart()
  const checkout = useCheckout()

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
  })
  const [tender, setTender] = useState<TenderOption>('card')
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvc: '',
    cardholderName: '',
  })
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
  })

  const paymentError =
    checkout.error instanceof Error ? checkout.error.message : 'Checkout failed. Please try again.'

  const derivedCardDetails = useMemo(() => {
    return tender === 'test-decline' ? DECLINE_CARD : cardDetails
  }, [cardDetails, tender])

  const handleAddressChange = (field: keyof typeof shippingAddress, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }))
  }

  const handleCardChange = (field: keyof typeof cardDetails, value: string) => {
    setCardDetails((current) => ({ ...current, [field]: value }))
  }

  const handleBankChange = (field: keyof typeof bankDetails, value: string) => {
    setBankDetails((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload: CheckoutInput = {
      shippingAddress,
      payment:
        tender === 'bank'
          ? {
              paymentMethod: 'BANK',
              cardholderName: bankDetails.accountHolderName,
            }
          : {
              paymentMethod: 'CARD',
              ...derivedCardDetails,
            },
    }

    try {
      const order = await checkout.mutateAsync(payload)
      navigate(`/orders/${order.id}`)
    } catch {
      // Inline error state is rendered from the mutation error.
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600">Error loading checkout.</p>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Add items to your cart before checking out.</p>
        <Link to="/products" className="mt-6">
          <Button>Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-gray-500">Review your order, add shipping details, and pay.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate('/cart')}>
          Back to Cart
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="street">
                  Street
                </label>
                <Input
                  id="street"
                  value={shippingAddress.street}
                  onChange={(event) => handleAddressChange('street', event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="city">
                  City
                </label>
                <Input
                  id="city"
                  value={shippingAddress.city}
                  onChange={(event) => handleAddressChange('city', event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="state">
                  State
                </label>
                <Input
                  id="state"
                  value={shippingAddress.state}
                  onChange={(event) => handleAddressChange('state', event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="postalCode">
                  Postal Code
                </label>
                <Input
                  id="postalCode"
                  value={shippingAddress.postalCode}
                  onChange={(event) => handleAddressChange('postalCode', event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="country">
                  Country
                </label>
                <Input
                  id="country"
                  value={shippingAddress.country}
                  onChange={(event) => handleAddressChange('country', event.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <TenderCard
                  checked={tender === 'card'}
                  description="Use a standard card payment and complete the order immediately."
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Card"
                  onSelect={() => setTender('card')}
                />
                <TenderCard
                  checked={tender === 'bank'}
                  description="Simulate a successful bank transfer through the mock gateway."
                  icon={<Landmark className="h-5 w-5" />}
                  title="Bank (simulated)"
                  onSelect={() => setTender('bank')}
                />
                <TenderCard
                  checked={tender === 'test-decline'}
                  description="Use the deterministic decline card to demo the failure state."
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Test decline"
                  onSelect={() => setTender('test-decline')}
                />
              </div>

              {tender === 'bank' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="accountHolderName"
                    >
                      Account Holder Name
                    </label>
                    <Input
                      id="accountHolderName"
                      value={bankDetails.accountHolderName}
                      onChange={(event) => handleBankChange('accountHolderName', event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="routingNumber"
                    >
                      Routing Number
                    </label>
                    <Input
                      id="routingNumber"
                      value={bankDetails.routingNumber}
                      onChange={(event) => handleBankChange('routingNumber', event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="accountNumber"
                    >
                      Account Number
                    </label>
                    <Input
                      id="accountNumber"
                      value={bankDetails.accountNumber}
                      onChange={(event) => handleBankChange('accountNumber', event.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="cardholderName"
                    >
                      Cardholder Name
                    </label>
                    <Input
                      id="cardholderName"
                      value={derivedCardDetails.cardholderName}
                      onChange={(event) => handleCardChange('cardholderName', event.target.value)}
                      required
                      disabled={tender === 'test-decline'}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="cardNumber"
                    >
                      Card Number
                    </label>
                    <Input
                      id="cardNumber"
                      value={derivedCardDetails.cardNumber}
                      onChange={(event) => handleCardChange('cardNumber', event.target.value)}
                      required
                      disabled={tender === 'test-decline'}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="cardExpMonth"
                    >
                      Expiration Month
                    </label>
                    <Input
                      id="cardExpMonth"
                      value={derivedCardDetails.cardExpMonth}
                      onChange={(event) => handleCardChange('cardExpMonth', event.target.value)}
                      required
                      disabled={tender === 'test-decline'}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-gray-700"
                      htmlFor="cardExpYear"
                    >
                      Expiration Year
                    </label>
                    <Input
                      id="cardExpYear"
                      value={derivedCardDetails.cardExpYear}
                      onChange={(event) => handleCardChange('cardExpYear', event.target.value)}
                      required
                      disabled={tender === 'test-decline'}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="cardCvc">
                      CVC
                    </label>
                    <Input
                      id="cardCvc"
                      value={derivedCardDetails.cardCvc}
                      onChange={(event) => handleCardChange('cardCvc', event.target.value)}
                      required
                      disabled={tender === 'test-decline'}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.subTotal, cart.currency)}</p>
                  </div>
                ))}
              </div>
              <hr />
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(cart.totalAmount, cart.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(cart.totalAmount, cart.currency)}</span>
              </div>
              {checkout.isError && <p className="text-sm text-red-600">{paymentError}</p>}
              <Button className="w-full" size="lg" type="submit" loading={checkout.isPending}>
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

interface TenderCardProps {
  checked: boolean
  description: string
  icon: React.ReactNode
  title: string
  onSelect: () => void
}

function TenderCard({ checked, description, icon, title, onSelect }: TenderCardProps) {
  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
        checked ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
      ].join(' ')}
    >
      <input
        checked={checked}
        className="mt-1 h-4 w-4"
        name="paymentMethod"
        type="radio"
        onChange={onSelect}
      />
      <div className="mt-0.5 text-primary-700">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </label>
  )
}
