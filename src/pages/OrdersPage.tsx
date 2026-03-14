import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Order, OrderStatus } from '@/types'

const statusVariants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

export default function OrdersPage() {
  const { data, isLoading, error } = useOrders()

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
        <p className="text-red-600">Error loading orders</p>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-16 w-16 text-gray-300" />
        <h2 className="mt-4 text-xl font-semibold">No orders yet</h2>
        <p className="mt-2 text-gray-500">Your order history will appear here</p>
        <Link to="/products" className="mt-6">
          <span className="text-primary-600 hover:underline">Start Shopping</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>

      <div className="space-y-4">
        {data.data.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/orders/${order.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                {formatCurrency(order.totalAmount, order.currency)}
              </p>
              <p className="text-sm text-gray-500">{order.items.length} items</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
