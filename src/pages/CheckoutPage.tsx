import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckout } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { validateAddress, type AddressErrors } from '@/utils/validateAddress'
import type { Address } from '@/types'

const EMPTY_ADDRESS: Address = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const checkout = useCheckout()
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})

  const handleChange = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await checkout.mutateAsync({ shippingAddress: address })
      navigate('/orders')
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
                />
                {errors[field] && (
                  <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" size="lg" loading={checkout.isPending}>
              Place Order
            </Button>
            {checkout.isError && (
              <p className="text-center text-sm text-red-600">
                Checkout failed. Please try again.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
