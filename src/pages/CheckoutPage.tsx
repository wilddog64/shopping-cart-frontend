import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/config/stripe'
import { useCheckout } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { validateAddress, type AddressErrors } from '@/utils/validateAddress'
import type { Address } from '@/types'

const EMPTY_ADDRESS: Address = { street: '', city: '', state: '', postalCode: '', country: '' }

function CheckoutForm() {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()
  const checkout = useCheckout()
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [cardError, setCardError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const handleChange = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCardError(null)
    setFailure(null)
    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!stripe || !elements) return
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })
    if (error || !paymentMethod) {
      setCardError(error?.message ?? 'Card details are invalid.')
      return
    }

    try {
      const result = await checkout.mutateAsync({
        shippingAddress: address,
        paymentMethodId: paymentMethod.id,
      })
      if (result.status === 'PAID') navigate(`/orders/${result.orderId}`)
      else setFailure(result.failureReason)
    } catch (err) {
      console.error('Checkout failed:', err)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {(Object.keys(EMPTY_ADDRESS) as (keyof Address)[]).map((field) => (
              <div key={field}>
                <Input
                  aria-label={field}
                  placeholder={field}
                  value={address[field]}
                  onChange={handleChange(field)}
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                />
                {errors[field] && (
                  <p id={`${field}-error`} className="mt-1 text-sm text-red-600">
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium">Card details</label>
              <div className="rounded-md border border-gray-300 p-3">
                <CardElement options={{ hidePostalCode: true }} />
              </div>
              {cardError && (
                <p id="card-error" className="mt-1 text-sm text-red-600">
                  {cardError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={checkout.isPending}
              disabled={!stripe}
            >
              Place Order
            </Button>
            {failure && <p className="text-center text-sm text-red-600">{failure}</p>}
            {checkout.isError && !failure && (
              <p className="text-center text-sm text-red-600">Checkout failed. Please try again.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutPage() {
  if (!stripePromise) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-red-600">
          Payments are not configured. Set VITE_STRIPE_PUBLISHABLE_KEY to enable checkout.
        </p>
      </div>
    )
  }
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}
