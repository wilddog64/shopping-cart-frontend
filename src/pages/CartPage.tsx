import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useCart, useUpdateCartItem, useRemoveCartItem, useCheckout } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/format'
import type { CartItem } from '@/types'

export default function CartPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading, error } = useCart()
  const checkout = useCheckout()

  const handleCheckout = async () => {
    try {
      const result = await checkout.mutateAsync()
      navigate(`/orders/${result.orderId}`)
    } catch (err) {
      console.error('Checkout failed:', err)
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
        <p className="text-red-600">Error loading cart</p>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-gray-500">Add some products to get started</p>
        <Link to="/products" className="mt-6">
          <Button>Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shopping Cart</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="divide-y p-0">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} currency={cart.currency} />
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(cart.totalAmount, cart.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(cart.totalAmount, cart.currency)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                loading={checkout.isPending}
              >
                Proceed to Checkout
              </Button>
              {checkout.isError && (
                <p className="text-center text-sm text-red-600">
                  Checkout failed. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CartItemRow({ item, currency }: { item: CartItem; currency: string }) {
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return
    updateItem.mutate({ itemId: item.id, data: { quantity: newQuantity } })
  }

  const handleRemove = () => {
    removeItem.mutate(item.id)
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-20 w-20 flex-shrink-0 rounded-md bg-gray-100" />
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-sm text-gray-500">{formatCurrency(item.unitPrice, currency)} each</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={item.quantity <= 1 || updateItem.isPending}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={updateItem.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-24 text-right font-medium">{formatCurrency(item.subTotal, currency)}</div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        disabled={removeItem.isPending}
        className="text-red-500 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
