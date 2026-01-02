import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { useOrder, useCancelOrder } from '@/hooks/useOrders'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { OrderStatus } from '@/types'

const statusVariants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: order, isLoading, error } = useOrder(id!)
  const cancelOrder = useCancelOrder()

  const handleCancel = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return
    try {
      await cancelOrder.mutateAsync(order.id)
    } catch (err) {
      console.error('Failed to cancel order:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center">
        <p className="text-red-600">Error loading order</p>
        <Button variant="link" onClick={() => navigate('/orders')}>
          Back to orders
        </Button>
      </div>
    )
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/orders')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariants[order.status]} className="self-start text-sm">
          {order.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="h-16 w-16 flex-shrink-0 rounded-md bg-gray-100" />
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.unitPrice, order.currency)} x {item.quantity}
                      </p>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(item.subTotal, order.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(order.totalAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>Free</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-gray-600">
                  {order.shippingAddress.street}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                  <br />
                  {order.shippingAddress.country}
                </address>
              </CardContent>
            </Card>
          )}

          {canCancel && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              loading={cancelOrder.isPending}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
